import { createHmac, randomUUID } from 'node:crypto';
import { and, like, lt, sql } from 'drizzle-orm';
import { runtimeConfig } from '$lib/server/config';
import { db } from '$lib/server/db';
import { rateLimit } from '$lib/server/db/schema';
import { ServiceError } from '$lib/server/errors';

interface AccessRateLimitPolicy {
	max: number;
	windowMs: number;
}

const POLICIES = {
	registerNetwork: { max: 5, windowMs: 5 * 60_000 },
	loginNetwork: { max: 30, windowMs: 60_000 },
	loginAccount: { max: 8, windowMs: 60_000 }
} as const satisfies Record<string, AccessRateLimitPolicy>;

type AccessRateLimitScope = keyof typeof POLICIES;
const STALE_RATE_LIMIT_MS = Math.max(...Object.values(POLICIES).map((policy) => policy.windowMs));

export function accessRateLimitSubject(value: string): string {
	return createHmac('sha256', runtimeConfig.authSecret)
		.update('pasted-access-rate-limit-v1\0')
		.update(value.trim().toLowerCase() || 'unknown')
		.digest('hex');
}

export async function enforceAccessRateLimit(
	scope: AccessRateLimitScope,
	subject: string
): Promise<void> {
	const policy = POLICIES[scope];
	const now = Date.now();
	const resetBefore = now - policy.windowMs;
	const key = `pasted-access:${scope}:${accessRateLimitSubject(subject)}`;
	await db
		.delete(rateLimit)
		.where(
			and(
				like(rateLimit.key, 'pasted-access:%'),
				lt(rateLimit.lastRequest, now - STALE_RATE_LIMIT_MS)
			)
		);
	const [result] = await db
		.insert(rateLimit)
		.values({ id: randomUUID(), key, count: 1, lastRequest: now })
		.onConflictDoUpdate({
			target: rateLimit.key,
			set: {
				count: sql<number>`case when ${rateLimit.lastRequest} < ${resetBefore} then 1 else ${rateLimit.count} + 1 end`,
				lastRequest: now
			}
		})
		.returning({ count: rateLimit.count });

	if (!result || result.count > policy.max) {
		throw new ServiceError('rate_limited', 'Too many attempts. Wait a moment and try again.', 429);
	}
}
