import { describe, expect, it } from 'vitest';
import { createShareToken, hashShareToken, isShareToken } from './token';
import { createShareSchema, shareIsActive } from './validation';

describe('share secrets', () => {
	it('creates independent 256 bit URL-safe tokens', () => {
		const first = createShareToken();
		const second = createShareToken();

		expect(first).not.toBe(second);
		expect(first).toHaveLength(43);
		expect(isShareToken(first)).toBe(true);
		expect(isShareToken(`${first}x`)).toBe(false);
	});

	it('hashes tokens deterministically without retaining the raw secret', () => {
		const token = createShareToken();
		const hash = hashShareToken(token);

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
		expect(hashShareToken(token)).toBe(hash);
		expect(hash).not.toContain(token);
	});
});

describe('share policy', () => {
	it('requires exactly one target', () => {
		expect(createShareSchema.safeParse({}).success).toBe(false);
		expect(
			createShareSchema.safeParse({
				itemId: 'd569bda2-a797-49e4-bc81-fb6098ec777f',
				collectionId: '2a47bffc-a582-44b4-886f-cebbd1d5cfaa'
			}).success
		).toBe(false);
		expect(
			createShareSchema.safeParse({ itemId: 'd569bda2-a797-49e4-bc81-fb6098ec777f' }).success
		).toBe(true);
	});

	it('rejects revoked and expired shares at the boundary', () => {
		const now = new Date('2026-07-17T12:00:00.000Z');

		expect(shareIsActive({ revokedAt: null, expiresAt: null }, now)).toBe(true);
		expect(
			shareIsActive({ revokedAt: null, expiresAt: new Date('2026-07-17T12:00:01.000Z') }, now)
		).toBe(true);
		expect(shareIsActive({ revokedAt: null, expiresAt: now }, now)).toBe(false);
		expect(shareIsActive({ revokedAt: now, expiresAt: null }, now)).toBe(false);
	});
});
