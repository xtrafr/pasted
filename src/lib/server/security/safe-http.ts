import { buildConnector, Client } from 'undici';
import type { Dispatcher } from 'undici';
import {
	approveRemoteUrl,
	normalizeIpAddress,
	type ApprovedRemoteUrl,
	type DnsResolver
} from './remote-url';

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export type SafeHttpErrorCode =
	| 'connection_failed'
	| 'remote_address_changed'
	| 'timeout'
	| 'too_many_redirects'
	| 'redirect_without_location'
	| 'unexpected_content_type'
	| 'unexpected_content_encoding'
	| 'response_too_large';

export class SafeHttpError extends Error {
	constructor(
		public readonly code: SafeHttpErrorCode,
		message: string
	) {
		super(message);
		this.name = 'SafeHttpError';
	}
}

export interface HopResponse {
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	body: Buffer;
}

export type HopRequester = (
	target: ApprovedRemoteUrl,
	options: Required<Pick<SafeFetchOptions, 'maxBytes' | 'timeoutMs'>> & {
		accept: string;
	}
) => Promise<HopResponse>;

export interface SafeFetchOptions {
	maxBytes: number;
	allowedContentTypes: readonly string[];
	accept?: string;
	maxRedirects?: number;
	timeoutMs?: number;
	resolver?: DnsResolver;
	requestHop?: HopRequester;
}

export interface SafeFetchResult extends HopResponse {
	finalUrl: URL;
	contentType: string;
	redirectCount: number;
}

function firstHeader(
	headers: Record<string, string | string[] | undefined>,
	name: string
): string | undefined {
	const value = headers[name] ?? headers[name.toLowerCase()];
	return Array.isArray(value) ? value[0] : value;
}

function contentTypeAllowed(contentType: string, allowed: readonly string[]): boolean {
	const mime = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
	return allowed.some((entry) => {
		const normalized = entry.toLowerCase();
		return normalized.endsWith('/*')
			? mime.startsWith(`${normalized.slice(0, -1)}`)
			: mime === normalized;
	});
}

function pinnedConnector(
	target: ApprovedRemoteUrl,
	address: string
): ReturnType<typeof buildConnector> {
	const connect = buildConnector({
		allowH2: false,
		maxCachedSessions: 0,
		timeout: 3_000
	});

	return (options, callback) => {
		connect(
			{
				...options,
				hostname: address,
				servername: target.hostname
			},
			(error, socket) => {
				if (error || !socket) {
					callback(error ?? new SafeHttpError('connection_failed', 'Connection failed'), null);
					return;
				}

				const remoteAddress = socket.remoteAddress;
				if (!remoteAddress || normalizeIpAddress(remoteAddress) !== normalizeIpAddress(address)) {
					socket.destroy();
					callback(
						new SafeHttpError('remote_address_changed', 'The connected address was not approved'),
						null
					);
					return;
				}

				callback(null, socket);
			}
		);
	};
}

async function readBody(body: Dispatcher.ResponseData['body'], maxBytes: number): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let total = 0;
	for await (const chunk of body) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		total += buffer.byteLength;
		if (total > maxBytes) {
			body.destroy();
			throw new SafeHttpError('response_too_large', 'The response exceeded the byte limit');
		}
		chunks.push(buffer);
	}
	return Buffer.concat(chunks, total);
}

export const requestApprovedTarget: HopRequester = async (target, options) => {
	const address = target.addresses[0];
	if (!address) throw new SafeHttpError('connection_failed', 'No approved address is available');

	const client = new Client(target.url.origin, {
		allowH2: false,
		pipelining: 0,
		maxHeaderSize: 16_384,
		headersTimeout: 4_000,
		bodyTimeout: 4_000,
		maxResponseSize: options.maxBytes,
		maxRequestsPerClient: 1,
		connect: pinnedConnector(target, address.address)
	});

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
	try {
		const response = await client.request({
			path: `${target.url.pathname}${target.url.search}`,
			method: 'GET',
			headers: {
				accept: options.accept,
				'accept-encoding': 'identity',
				'user-agent': 'Pasted/0.1 (+https://github.com/xtrafr/pasted)'
			},
			signal: controller.signal
		});

		const body = redirectStatuses.has(response.statusCode)
			? (await response.body.dump(), Buffer.alloc(0))
			: await readBody(response.body, options.maxBytes);

		return {
			statusCode: response.statusCode,
			headers: response.headers,
			body
		};
	} catch (error) {
		if (controller.signal.aborted) {
			throw new SafeHttpError('timeout', 'The request timed out');
		}
		throw error;
	} finally {
		clearTimeout(timeout);
		await client.close();
	}
};

export async function safeFetchBuffer(
	input: string | URL,
	options: SafeFetchOptions
): Promise<SafeFetchResult> {
	const maxRedirects = options.maxRedirects ?? 3;
	const timeoutMs = options.timeoutMs ?? 8_000;
	const accept = options.accept ?? options.allowedContentTypes.join(', ');
	const requestHop = options.requestHop ?? requestApprovedTarget;
	let currentUrl = input instanceof URL ? new URL(input) : new URL(input);

	for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
		const target = await approveRemoteUrl(currentUrl, options.resolver);
		const response = await requestHop(target, {
			maxBytes: options.maxBytes,
			timeoutMs,
			accept
		});

		if (redirectStatuses.has(response.statusCode)) {
			if (redirectCount === maxRedirects) {
				throw new SafeHttpError('too_many_redirects', 'The response redirected too many times');
			}
			const location = firstHeader(response.headers, 'location');
			if (!location) {
				throw new SafeHttpError(
					'redirect_without_location',
					'The redirect did not include a location'
				);
			}
			currentUrl = new URL(location, target.url);
			continue;
		}

		const contentLength = Number(firstHeader(response.headers, 'content-length') ?? 0);
		if (Number.isFinite(contentLength) && contentLength > options.maxBytes) {
			throw new SafeHttpError('response_too_large', 'The response exceeded the byte limit');
		}
		if (response.body.byteLength > options.maxBytes) {
			throw new SafeHttpError('response_too_large', 'The response exceeded the byte limit');
		}

		const contentEncoding = firstHeader(response.headers, 'content-encoding')?.toLowerCase();
		if (contentEncoding && contentEncoding !== 'identity') {
			throw new SafeHttpError(
				'unexpected_content_encoding',
				'Compressed remote responses are not accepted'
			);
		}

		const contentType = firstHeader(response.headers, 'content-type') ?? '';
		if (!contentTypeAllowed(contentType, options.allowedContentTypes)) {
			throw new SafeHttpError('unexpected_content_type', 'The response type is not allowed');
		}

		return {
			...response,
			finalUrl: target.url,
			contentType: contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '',
			redirectCount
		};
	}

	throw new SafeHttpError('too_many_redirects', 'The response redirected too many times');
}
