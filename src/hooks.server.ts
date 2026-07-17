import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
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
