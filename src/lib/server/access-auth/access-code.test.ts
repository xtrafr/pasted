import { describe, expect, it } from 'vitest';
import {
	ACCESS_CODE_LENGTH,
	accessLoginSchema,
	accessRegistrationSchema,
	createSyntheticEmail,
	generateAccessCode,
	hashAccessCode,
	normalizeAccessCodeInput
} from './access-code';

describe('access codes', () => {
	it('generates unique mixed alphanumeric codes with exactly 32 characters', () => {
		const codes = Array.from({ length: 256 }, () => generateAccessCode());

		for (const code of codes) {
			expect(code).toHaveLength(ACCESS_CODE_LENGTH);
			expect(code).toMatch(/^[A-Za-z0-9]{32}$/);
			expect(code).toMatch(/[A-Za-z]/);
			expect(code).toMatch(/[0-9]/);
		}
		expect(new Set(codes).size).toBe(codes.length);
	});

	it('normalizes surrounding paste whitespace without changing code case', () => {
		const accessCode = 'A1234567890123456789012345678901';
		expect(normalizeAccessCodeInput(`\r\n ${accessCode}\t`)).toBe(accessCode);
		expect(accessLoginSchema.parse({ accessCode: `\r\n ${accessCode}\t` })).toEqual({
			accessCode
		});
		expect(accessLoginSchema.safeParse({ accessCode: accessCode.toLowerCase() }).success).toBe(
			true
		);
	});

	it('rejects malformed codes and all alternate credential fields', () => {
		expect(accessLoginSchema.safeParse({ accessCode: 'short' }).success).toBe(false);
		expect(
			accessLoginSchema.safeParse({
				accessCode: 'A1234567890123456789012345678901',
				email: 'person@example.test'
			}).success
		).toBe(false);
		expect(
			accessRegistrationSchema.safeParse({
				email: 'person@example.test',
				password: 'not-a-public-credential'
			}).success
		).toBe(false);
	});

	it('creates a stable context-separated lookup hash without retaining plaintext', () => {
		const accessCode = 'A1234567890123456789012345678901';
		const first = hashAccessCode(accessCode);
		const again = hashAccessCode(accessCode);
		const anotherCode = hashAccessCode('B1234567890123456789012345678902');

		expect(first).toMatch(/^[a-f0-9]{64}$/);
		expect(first).toBe(again);
		expect(first).not.toBe(anotherCode);
		expect(first).not.toContain(accessCode);
	});

	it('creates opaque unique synthetic internal addresses', () => {
		const first = createSyntheticEmail();
		const second = createSyntheticEmail();

		expect(first).toMatch(/^access\.[a-f0-9]{32}@accounts\.pasted\.invalid$/);
		expect(second).not.toBe(first);
	});
});
