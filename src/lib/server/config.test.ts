import { describe, expect, it } from 'vitest';
import { parseTrustedProxyIps } from './config';

describe('trusted proxy configuration', () => {
	it('returns an empty list when no proxies are configured', () => {
		expect(parseTrustedProxyIps(undefined)).toEqual([]);
		expect(parseTrustedProxyIps('  ')).toEqual([]);
	});

	it('parses, trims, and de-duplicates IP addresses and CIDR ranges', () => {
		expect(parseTrustedProxyIps('127.0.0.1, 10.12.0.0/16, 2001:db8::1, 127.0.0.1')).toEqual([
			'127.0.0.1',
			'10.12.0.0/16',
			'2001:db8::1'
		]);
	});

	it('rejects invalid trusted proxy entries', () => {
		expect(() => parseTrustedProxyIps('127.0.0.1,not-an-ip')).toThrow(
			'TRUSTED_PROXY_IPS contains invalid IP addresses or CIDR ranges: not-an-ip'
		);
		expect(() => parseTrustedProxyIps('10.0.0.0/99')).toThrow('10.0.0.0/99');
	});
});
