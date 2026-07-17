import { createHash, randomBytes } from 'node:crypto';

const SHARE_TOKEN_BYTES = 32;
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createShareToken(): string {
	return randomBytes(SHARE_TOKEN_BYTES).toString('base64url');
}

export function hashShareToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isShareToken(token: string): boolean {
	return SHARE_TOKEN_PATTERN.test(token);
}
