import { createHash, randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';

export const ACCESS_CODE_LENGTH = 32;
export const ACCESS_CODE_ALPHABET =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ACCESS_CODE_PATTERN = /^[A-Za-z0-9]{32}$/;
const ACCESS_CODE_LOOKUP_CONTEXT = 'pasted-access-code-lookup-v1\0';

/**
 * Produces a uniform sample from the set of 32-character alphanumeric strings
 * that contain at least one letter and one digit. randomInt uses rejection
 * sampling internally, and the outer rejection keeps the mixed-class guarantee
 * without biasing individual valid codes.
 */
export function generateAccessCode(): string {
	for (;;) {
		let code = '';
		for (let index = 0; index < ACCESS_CODE_LENGTH; index += 1) {
			code += ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)]!;
		}
		if (/[A-Za-z]/.test(code) && /[0-9]/.test(code)) return code;
	}
}

export function normalizeAccessCodeInput(value: string): string {
	return value.trim();
}

export function hashAccessCode(accessCode: string): string {
	// The generated code has about 190 bits of entropy, so a stable, context-
	// separated SHA-256 lookup is resistant to preimage search without coupling
	// account access to rotation of Better Auth's session secret.
	return createHash('sha256').update(ACCESS_CODE_LOOKUP_CONTEXT).update(accessCode).digest('hex');
}

export function createSyntheticEmail(): string {
	return `access.${randomUUID().replaceAll('-', '')}@accounts.pasted.invalid`;
}

const accessCodeSchema = z
	.string()
	.transform(normalizeAccessCodeInput)
	.pipe(
		z
			.string()
			.length(ACCESS_CODE_LENGTH, 'Access code must contain exactly 32 characters')
			.regex(ACCESS_CODE_PATTERN, 'Access code must contain only letters and digits')
	);

const optionalDisplayNameSchema = z.preprocess(
	(value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
	z.string().trim().min(1).max(80).optional()
);

export const accessRegistrationSchema = z
	.object({
		displayName: optionalDisplayNameSchema
	})
	.strict();

export const accessLoginSchema = z
	.object({
		accessCode: accessCodeSchema
	})
	.strict();
