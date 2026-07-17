import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { runtimeConfig } from '$lib/server/config';

const socialProviders =
	runtimeConfig.githubClientId && runtimeConfig.githubClientSecret
		? {
				github: {
					clientId: runtimeConfig.githubClientId,
					clientSecret: runtimeConfig.githubClientSecret
				}
			}
		: {};

export const auth = betterAuth({
	appName: 'Pasted',
	baseURL: runtimeConfig.origin,
	secret: runtimeConfig.authSecret,
	trustedOrigins: [runtimeConfig.origin],
	advanced: {
		trustedProxyHeaders: false,
		ipAddress: {
			ipAddressHeaders: ['x-forwarded-for'],
			...(runtimeConfig.trustedProxyIps.length > 0
				? { trustedProxies: [...runtimeConfig.trustedProxyIps] }
				: {})
		}
	},
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 12,
		maxPasswordLength: 128,
		revokeSessionsOnPasswordReset: true
	},
	socialProviders,
	rateLimit: {
		enabled: true,
		storage: 'database',
		window: 60,
		max: 60,
		customRules: {
			'/sign-in/email': { window: 60, max: 8 },
			'/sign-up/email': { window: 300, max: 5 },
			'/request-password-reset': { window: 300, max: 3 }
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
