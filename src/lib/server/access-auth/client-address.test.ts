import { describe, expect, it } from 'vitest';
import { resolveAccessClientAddress } from './client-address';

function source(directAddress: string, forwardedFor?: string) {
	return {
		getClientAddress: () => directAddress,
		request: new Request('https://pasted.example.test/access', {
			headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}
		})
	};
}

describe('access client address', () => {
	it('ignores forwarded headers from an untrusted direct client', () => {
		expect(resolveAccessClientAddress(source('203.0.113.10', '198.51.100.8'), ['127.0.0.1'])).toBe(
			'203.0.113.10'
		);
	});

	it('walks a trusted forwarded chain from right to left', () => {
		expect(
			resolveAccessClientAddress(source('127.0.0.1', '198.51.100.8, 10.2.3.4'), [
				'127.0.0.1',
				'10.0.0.0/8'
			])
		).toBe('198.51.100.8');
	});

	it('uses one quota identity for each IPv6 /64 network', () => {
		expect(resolveAccessClientAddress(source('2001:db8:12:34::beef'))).toBe(
			'2001:db8:12:34:0:0:0:0'
		);
		expect(resolveAccessClientAddress(source('2001:db8:12:34::cafe'))).toBe(
			'2001:db8:12:34:0:0:0:0'
		);
	});

	it('falls back to a non-spoofable shared proxy identity when forwarding is invalid', () => {
		expect(resolveAccessClientAddress(source('127.0.0.1', 'not-an-ip'), ['127.0.0.1'])).toBe(
			'trusted-proxy:127.0.0.1'
		);
	});

	it('uses a shared unavailable identity when the adapter cannot resolve an address', () => {
		expect(
			resolveAccessClientAddress({
				getClientAddress: () => {
					throw new Error('Address unavailable');
				},
				request: new Request('https://pasted.example.test/access')
			})
		).toBe('unavailable');
	});
});
