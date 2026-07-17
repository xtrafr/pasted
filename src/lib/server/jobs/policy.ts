import { METADATA_RETRY_DELAY_MAX_SECONDS, METADATA_RETRY_DELAY_SECONDS } from './constants';

const terminalRemoteCodes = new Set([
	'invalid_url',
	'blocked_protocol',
	'credentials_not_allowed',
	'blocked_port',
	'blocked_hostname',
	'blocked_address'
]);

const terminalHttpCodes = new Set([
	'remote_address_changed',
	'response_too_large',
	'unexpected_content_type',
	'unexpected_content_encoding'
]);

export interface MetadataFailure {
	state: 'blocked' | 'failed';
	code: string;
}

function safeErrorCode(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
	const code = (error as { code?: unknown }).code;
	if (typeof code !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(code)) return undefined;
	return code;
}

export function classifyMetadataFailure(error: unknown): MetadataFailure {
	const code = safeErrorCode(error) ?? 'metadata_fetch_failed';
	return {
		state: terminalRemoteCodes.has(code) || terminalHttpCodes.has(code) ? 'blocked' : 'failed',
		code
	};
}

export function metadataRetryDelaySeconds(retryCount: number): number {
	const safeRetryCount = Math.max(0, Math.min(16, Math.floor(retryCount)));
	return Math.min(
		METADATA_RETRY_DELAY_MAX_SECONDS,
		METADATA_RETRY_DELAY_SECONDS * 2 ** safeRetryCount
	);
}

export function metadataNextRetryAt(
	retryCount: number,
	retryLimit: number,
	now = new Date()
): Date | null {
	if (retryCount >= retryLimit) return null;
	return new Date(now.getTime() + metadataRetryDelaySeconds(retryCount) * 1_000);
}

export function metadataIsFresh(
	lastFetchedAt: Date | null,
	now: Date,
	freshnessMs: number
): boolean {
	return lastFetchedAt !== null && now.getTime() - lastFetchedAt.getTime() < freshnessMs;
}
