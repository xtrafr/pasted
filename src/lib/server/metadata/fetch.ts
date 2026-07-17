import { fileTypeFromBuffer } from 'file-type';
import { safeFetchBuffer, type SafeFetchOptions } from '$lib/server/security/safe-http';
import { parseLinkMetadata, type ParsedLinkMetadata } from './parse';

const allowedImageTypes = new Set([
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/gif',
	'image/avif',
	'image/x-icon',
	'image/vnd.microsoft.icon'
]);

export interface FetchedLinkMetadata extends ParsedLinkMetadata {
	finalUrl: string;
	statusCode: number;
}

export async function fetchLinkMetadata(
	url: string,
	options: Pick<SafeFetchOptions, 'resolver' | 'requestHop'> = {}
): Promise<FetchedLinkMetadata> {
	const response = await safeFetchBuffer(url, {
		maxBytes: 1_048_576,
		allowedContentTypes: ['text/html', 'application/xhtml+xml'],
		accept: 'text/html, application/xhtml+xml',
		maxRedirects: 3,
		timeoutMs: 8_000,
		...options
	});
	const metadata = parseLinkMetadata(response.body.toString('utf8'), response.finalUrl);

	return {
		...metadata,
		finalUrl: response.finalUrl.toString(),
		statusCode: response.statusCode
	};
}

export interface FetchedImage {
	bytes: Buffer;
	mimeType: string;
	extension: string;
	finalUrl: string;
}

export async function fetchMetadataImage(
	url: string,
	kind: 'favicon' | 'preview',
	options: Pick<SafeFetchOptions, 'resolver' | 'requestHop'> = {}
): Promise<FetchedImage> {
	const response = await safeFetchBuffer(url, {
		maxBytes: kind === 'favicon' ? 262_144 : 2_097_152,
		allowedContentTypes: ['image/*'],
		accept: 'image/avif, image/webp, image/png, image/jpeg, image/gif, image/x-icon',
		maxRedirects: 3,
		timeoutMs: 8_000,
		...options
	});
	const detected = await fileTypeFromBuffer(response.body);
	if (!detected || !allowedImageTypes.has(detected.mime) || detected.mime === 'image/svg+xml') {
		throw new Error('The remote image format is not allowed');
	}

	return {
		bytes: response.body,
		mimeType: detected.mime,
		extension: detected.ext,
		finalUrl: response.finalUrl.toString()
	};
}
