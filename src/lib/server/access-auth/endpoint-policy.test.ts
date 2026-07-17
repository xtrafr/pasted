import { describe, expect, it } from 'vitest';
import { isPublicBetterAuthEndpointAllowed } from './endpoint-policy';

describe('public Better Auth endpoint policy', () => {
	it('keeps only sign out public', () => {
		expect(isPublicBetterAuthEndpointAllowed('/api/auth/sign-out')).toBe(true);
	});

	it.each([
		'/api/auth/get-session',
		'/api/auth/sign-up/email',
		'/api/auth/sign-in/email',
		'/api/auth/sign-in/social',
		'/api/auth/callback/github',
		'/api/auth/request-password-reset',
		'/api/auth/reset-password',
		'/api/auth/change-password',
		'/api/auth/set-password',
		'/api/auth/delete-user'
	])('blocks alternate credential endpoint %s', (pathname) => {
		expect(isPublicBetterAuthEndpointAllowed(pathname)).toBe(false);
	});
});
