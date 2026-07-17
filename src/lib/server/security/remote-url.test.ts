import { describe, expect, it } from 'vitest';
import { approveRemoteUrl, isPublicIpAddress, type DnsResolver } from './remote-url';
import { safeFetchBuffer, type HopRequester } from './safe-http';

const publicResolver: DnsResolver = async () => [{ address: '93.184.216.34', family: 4 }];

describe('remote URL approval', () => {
	it('accepts a public HTTP target', async () => {
		const approved = await approveRemoteUrl('https://example.org/article', publicResolver);
		expect(approved.addresses[0]?.address).toBe('93.184.216.34');
	});

	it.each([
		'127.0.0.1',
		'10.0.0.1',
		'172.16.0.1',
		'192.168.1.1',
		'169.254.169.254',
		'100.64.0.1',
		'::1',
		'fc00::1',
		'fe80::1',
		'::ffff:127.0.0.1'
	])('rejects non-public address %s', (address) => {
		expect(isPublicIpAddress(address)).toBe(false);
	});

	it.each([
		'javascript:alert(1)',
		'data:text/plain,hello',
		'http://localhost/admin',
		'http://service.internal/',
		'http://user:pass@example.org/',
		'http://example.org:8080/'
	])('rejects unsafe URL %s', async (url) => {
		await expect(approveRemoteUrl(url, publicResolver)).rejects.toThrow();
	});

	it('rejects a hostname when any DNS result is private', async () => {
		const mixedResolver: DnsResolver = async () => [
			{ address: '93.184.216.34', family: 4 },
			{ address: '127.0.0.1', family: 4 }
		];
		await expect(approveRemoteUrl('https://example.org', mixedResolver)).rejects.toMatchObject({
			code: 'blocked_address'
		});
	});
});

describe('safe redirect handling', () => {
	it('revalidates a redirect before the next request', async () => {
		let requests = 0;
		const requestHop: HopRequester = async () => {
			requests += 1;
			return {
				statusCode: 302,
				headers: { location: 'http://127.0.0.1/private' },
				body: Buffer.alloc(0)
			};
		};

		await expect(
			safeFetchBuffer('https://example.org', {
				maxBytes: 1024,
				allowedContentTypes: ['text/html'],
				resolver: publicResolver,
				requestHop
			})
		).rejects.toMatchObject({ code: 'blocked_address' });
		expect(requests).toBe(1);
	});

	it('rejects oversized and unexpected responses', async () => {
		const requestHop: HopRequester = async () => ({
			statusCode: 200,
			headers: { 'content-type': 'application/octet-stream' },
			body: Buffer.alloc(2048)
		});

		await expect(
			safeFetchBuffer('https://example.org', {
				maxBytes: 1024,
				allowedContentTypes: ['text/html'],
				resolver: publicResolver,
				requestHop
			})
		).rejects.toMatchObject({ code: 'response_too_large' });
	});
});
