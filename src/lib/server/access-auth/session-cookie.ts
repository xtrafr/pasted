import type { Cookies } from '@sveltejs/kit';
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies';

/**
 * Copies Better Auth's internal endpoint cookies into SvelteKit's outgoing
 * cookie jar. This keeps custom access-code routes independent from response
 * object reuse and preserves every cookie attribute selected by Better Auth.
 */
export function applyBetterAuthSessionCookies(cookies: Cookies, headers: Headers): void {
	const setCookie = headers.get('set-cookie');
	if (!setCookie) throw new Error('Better Auth did not issue a session cookie');

	const parsed = parseSetCookieHeader(setCookie);
	if (parsed.size === 0) throw new Error('Better Auth issued an invalid session cookie');

	for (const [name, attributes] of parsed) {
		cookies.set(name, attributes.value, {
			...toCookieOptions(attributes),
			path: attributes.path || '/'
		});
	}
}
