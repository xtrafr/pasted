import type { RequestEvent } from '@sveltejs/kit';
import ipaddr from 'ipaddr.js';
import { runtimeConfig } from '$lib/server/config';

const UNAVAILABLE_CLIENT_ADDRESS = 'unavailable';

type Address = ipaddr.IPv4 | ipaddr.IPv6;
type AddressSource = Pick<RequestEvent, 'getClientAddress' | 'request'>;

function parseAddress(value: string): Address | null {
	try {
		return ipaddr.process(value.trim());
	} catch {
		return null;
	}
}

function rateLimitIdentity(address: Address): string {
	if (address instanceof ipaddr.IPv4) return address.toString();
	const bytes = address.toByteArray();
	bytes.fill(0, 8);
	return ipaddr.fromByteArray(bytes).toNormalizedString();
}

function matchesTrustedProxy(address: Address, entry: string): boolean {
	try {
		const [network, prefix] = entry.includes('/')
			? ipaddr.parseCIDR(entry)
			: (() => {
					const parsed = ipaddr.process(entry);
					return [parsed, parsed instanceof ipaddr.IPv4 ? 32 : 128] as const;
				})();
		if (address instanceof ipaddr.IPv4 && network instanceof ipaddr.IPv4) {
			return address.match(network, prefix);
		}
		if (address instanceof ipaddr.IPv6 && network instanceof ipaddr.IPv6) {
			return address.match(network, prefix);
		}
		return false;
	} catch {
		return false;
	}
}

function isTrustedProxy(address: Address, trustedProxyIps: readonly string[]): boolean {
	return trustedProxyIps.some((entry) => matchesTrustedProxy(address, entry));
}

function forwardedClientAddress(value: string, trustedProxyIps: readonly string[]): string | null {
	const addresses = value
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
	if (addresses.length === 0) return null;

	for (let index = addresses.length - 1; index >= 0; index -= 1) {
		const address = parseAddress(addresses[index]!);
		if (!address) return null;
		if (isTrustedProxy(address, trustedProxyIps)) continue;
		return rateLimitIdentity(address);
	}
	return null;
}

export function resolveAccessClientAddress(
	event: AddressSource,
	trustedProxyIps: readonly string[] = runtimeConfig.trustedProxyIps
): string {
	let directValue: string;
	try {
		directValue = event.getClientAddress()?.trim();
	} catch {
		return UNAVAILABLE_CLIENT_ADDRESS;
	}
	const directAddress = parseAddress(directValue);
	if (!directAddress) return UNAVAILABLE_CLIENT_ADDRESS;

	if (!isTrustedProxy(directAddress, trustedProxyIps)) {
		return rateLimitIdentity(directAddress);
	}

	const forwarded = event.request.headers.get('x-forwarded-for');
	return (
		(forwarded ? forwardedClientAddress(forwarded, trustedProxyIps) : null) ??
		`trusted-proxy:${rateLimitIdentity(directAddress)}`
	);
}
