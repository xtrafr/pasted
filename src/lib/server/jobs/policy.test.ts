import { describe, expect, it } from 'vitest';
import { RemoteUrlError } from '$lib/server/security/remote-url';
import { SafeHttpError } from '$lib/server/security/safe-http';
import {
	classifyMetadataFailure,
	metadataIsFresh,
	metadataNextRetryAt,
	metadataRetryDelaySeconds
} from './policy';
import { HostRateGate } from './rate-limit';

describe('metadata job policy', () => {
	it('treats security policy failures as terminal blocks', () => {
		expect(classifyMetadataFailure(new RemoteUrlError('blocked_address', 'Blocked')).state).toBe(
			'blocked'
		);
		expect(
			classifyMetadataFailure(new SafeHttpError('remote_address_changed', 'Changed')).state
		).toBe('blocked');
		expect(classifyMetadataFailure(new SafeHttpError('timeout', 'Timed out'))).toEqual({
			state: 'failed',
			code: 'timeout'
		});
	});

	it('uses bounded exponential retry delays and stops at the limit', () => {
		const now = new Date('2026-07-17T12:00:00.000Z');

		expect(metadataRetryDelaySeconds(0)).toBe(15);
		expect(metadataRetryDelaySeconds(3)).toBe(120);
		expect(metadataRetryDelaySeconds(99)).toBe(900);
		expect(metadataNextRetryAt(1, 3, now)?.toISOString()).toBe('2026-07-17T12:00:30.000Z');
		expect(metadataNextRetryAt(3, 3, now)).toBeNull();
	});

	it('recognizes the freshness window without accepting future boundaries as stale', () => {
		const now = new Date('2026-07-17T12:00:00.000Z');
		expect(metadataIsFresh(new Date('2026-07-17T11:00:00.000Z'), now, 3_600_001)).toBe(true);
		expect(metadataIsFresh(new Date('2026-07-17T11:00:00.000Z'), now, 3_600_000)).toBe(false);
		expect(metadataIsFresh(null, now, 3_600_000)).toBe(false);
	});
});

describe('metadata host rate gate', () => {
	it('spaces requests to the same host while allowing a different host immediately', async () => {
		let clock = 1_000;
		const waits: number[] = [];
		const gate = new HostRateGate({
			intervalMs: 750,
			now: () => clock,
			sleep: async (milliseconds) => {
				waits.push(milliseconds);
				clock += milliseconds;
			}
		});

		await gate.wait('Example.com');
		await gate.wait('example.com');
		await gate.wait('other.example');

		expect(waits).toEqual([0, 750, 0]);
	});
});
