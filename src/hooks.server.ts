import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { isPublicBetterAuthEndpointAllowed } from '$lib/server/access-auth/endpoint-policy';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (
		(event.url.pathname === '/api/auth' || event.url.pathname.startsWith('/api/auth/')) &&
		!isPublicBetterAuthEndpointAllowed(event.url.pathname)
	) {
		return new Response(null, {
			status: 404,
			headers: {
				'cache-control': 'no-store',
				'x-content-type-options': 'nosniff'
			}
		});
	}

	const hasSessionCookie = event.cookies
		.getAll()
		.some(({ name }) => name.includes('session_token'));
	const session = hasSessionCookie
		? await auth.api.getSession({ headers: event.request.headers })
		: null;

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
