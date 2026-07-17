const PUBLIC_BETTER_AUTH_ENDPOINTS = new Set(['/api/auth/sign-out']);

export function isPublicBetterAuthEndpointAllowed(pathname: string): boolean {
	return PUBLIC_BETTER_AUTH_ENDPOINTS.has(pathname);
}
