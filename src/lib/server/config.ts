import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import ipaddr from 'ipaddr.js';
import { z } from 'zod';

const localDatabaseUrl = 'postgres://pasted:pasted@127.0.0.1:5432/pasted';
const localAuthSecret = 'local-development-secret-change-before-production';

const positiveInteger = z.coerce.number().int().positive();
const parsedPoolSize = positiveInteger.safeParse(env.DATABASE_POOL_SIZE ?? 10);

function isValidProxyAddress(value: string): boolean {
	try {
		if (value.includes('/')) {
			ipaddr.parseCIDR(value);
			return true;
		}
		return ipaddr.isValid(value);
	} catch {
		return false;
	}
}

export function parseTrustedProxyIps(value: string | undefined): readonly string[] {
	const entries = [
		...new Set(
			(value ?? '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		)
	];
	const invalid = entries.filter((entry) => !isValidProxyAddress(entry));
	if (invalid.length > 0) {
		throw new Error(
			`TRUSTED_PROXY_IPS contains invalid IP addresses or CIDR ranges: ${invalid.join(', ')}`
		);
	}
	return entries;
}

export const runtimeConfig = {
	databaseUrl: env.DATABASE_URL ?? localDatabaseUrl,
	databasePoolSize: parsedPoolSize.success ? parsedPoolSize.data : 10,
	origin: env.ORIGIN ?? 'http://localhost:5173',
	authSecret: env.BETTER_AUTH_SECRET ?? localAuthSecret,
	trustedProxyIps: parseTrustedProxyIps(env.TRUSTED_PROXY_IPS),
	isProduction: env.NODE_ENV === 'production'
} as const;

if (!building && runtimeConfig.isProduction) {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
	if (!env.ORIGIN) throw new Error('ORIGIN is required in production');
	if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
		throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters in production');
	}
}
