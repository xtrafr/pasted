import type { RequestEvent } from './$types';
import {
	applyBetterAuthSessionCookies,
	loginWithAccessCode,
	resolveAccessClientAddress
} from '$lib/server/access-auth';
import { apiResponse, readJson } from '$lib/server/http/api';

export const POST = (event: RequestEvent) =>
	apiResponse(async () =>
		loginWithAccessCode(await readJson(event.request), {
			headers: event.request.headers,
			clientAddress: resolveAccessClientAddress(event),
			applySessionHeaders: (headers) => applyBetterAuthSessionCookies(event.cookies, headers)
		})
	);
