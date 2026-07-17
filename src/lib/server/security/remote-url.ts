import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const blockedHostnameSuffixes = [
	'.localhost',
	'.local',
	'.internal',
	'.home',
	'.lan',
	'.test',
	'.invalid',
	'.example',
	'.onion'
] as const;

export type RemoteUrlErrorCode =
	| 'invalid_url'
	| 'blocked_protocol'
	| 'credentials_not_allowed'
	| 'blocked_port'
	| 'blocked_hostname'
	| 'dns_failed'
	| 'dns_empty'
	| 'blocked_address';

export class RemoteUrlError extends Error {
	constructor(
		public readonly code: RemoteUrlErrorCode,
		message: string
	) {
		super(message);
		this.name = 'RemoteUrlError';
	}
}

export interface ResolvedAddress {
	address: string;
	family: 4 | 6;
}

export type DnsResolver = (hostname: string) => Promise<readonly ResolvedAddress[]>;

export interface ApprovedRemoteUrl {
	url: URL;
	hostname: string;
	addresses: readonly ResolvedAddress[];
}

function stripIpv6Brackets(value: string): string {
	return value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
}

function stripZoneId(value: string): string {
	return value.split('%', 1)[0] ?? value;
}

export function normalizeIpAddress(value: string): string {
	const parsed = ipaddr.parse(stripZoneId(stripIpv6Brackets(value)));
	if (parsed.kind() === 'ipv6') {
		const ipv6 = parsed as ipaddr.IPv6;
		if (ipv6.isIPv4MappedAddress()) return ipv6.toIPv4Address().toString();
	}
	return parsed.toNormalizedString();
}

export function isPublicIpAddress(value: string): boolean {
	if (!ipaddr.isValid(stripZoneId(stripIpv6Brackets(value)))) return false;

	const parsed = ipaddr.parse(stripZoneId(stripIpv6Brackets(value)));
	if (parsed.kind() === 'ipv6') {
		const ipv6 = parsed as ipaddr.IPv6;
		if (ipv6.isIPv4MappedAddress()) return ipv6.toIPv4Address().range() === 'unicast';
	}

	return parsed.range() === 'unicast';
}

export function isBlockedHostname(value: string): boolean {
	const hostname = stripIpv6Brackets(value).replace(/\.$/, '').toLowerCase();
	if (!hostname || hostname.length > 253) return true;
	if (hostname === 'localhost') return true;
	return blockedHostnameSuffixes.some(
		(suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
	);
}

export const systemDnsResolver: DnsResolver = async (hostname) => {
	try {
		const results = await lookup(hostname, { all: true, order: 'verbatim' });
		return results
			.filter(
				(result): result is { address: string; family: 4 | 6 } =>
					result.family === 4 || result.family === 6
			)
			.map((result) => ({ address: result.address, family: result.family }));
	} catch (error) {
		throw new RemoteUrlError(
			'dns_failed',
			error instanceof Error ? `DNS lookup failed: ${error.message}` : 'DNS lookup failed'
		);
	}
};

export async function approveRemoteUrl(
	input: string | URL,
	resolver: DnsResolver = systemDnsResolver
): Promise<ApprovedRemoteUrl> {
	let url: URL;
	try {
		url = input instanceof URL ? new URL(input) : new URL(input);
	} catch {
		throw new RemoteUrlError('invalid_url', 'The URL could not be parsed');
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new RemoteUrlError('blocked_protocol', 'Only HTTP and HTTPS URLs are allowed');
	}
	if (url.username || url.password) {
		throw new RemoteUrlError('credentials_not_allowed', 'Credentials in URLs are not allowed');
	}

	const expectedPort = url.protocol === 'https:' ? '443' : '80';
	if (url.port && url.port !== expectedPort) {
		throw new RemoteUrlError('blocked_port', 'Only ports 80 and 443 are allowed');
	}

	const hostname = stripIpv6Brackets(url.hostname).replace(/\.$/, '').toLowerCase();
	if (isBlockedHostname(hostname)) {
		throw new RemoteUrlError('blocked_hostname', 'The hostname is not allowed');
	}

	const addresses = ipaddr.isValid(hostname)
		? [{ address: hostname, family: ipaddr.parse(hostname).kind() === 'ipv4' ? 4 : 6 } as const]
		: await resolver(hostname);

	if (addresses.length === 0) {
		throw new RemoteUrlError('dns_empty', 'The hostname did not resolve to an address');
	}

	const normalized = addresses.map((result) => ({
		address: normalizeIpAddress(result.address),
		family: result.family
	}));
	if (normalized.some((result) => !isPublicIpAddress(result.address))) {
		throw new RemoteUrlError('blocked_address', 'The hostname resolved to a blocked address');
	}

	url.hostname = url.hostname.toLowerCase();
	return { url, hostname, addresses: normalized };
}
