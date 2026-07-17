import type { RequestEvent } from './$types';
import {
	applyBetterAuthSessionCookies,
	registerAccessAccount,
	resolveAccessClientAddress
} from '$lib/server/access-auth';
import { apiResponse, readJson } from '$lib/server/http/api';

export const POST = (event: RequestEvent) =>
	apiResponse(
		async () =>
			registerAccessAccount(await readJson(event.request), {
				headers: event.request.headers,
				clientAddress: resolveAccessClientAddress(event),
				applySessionHeaders: (headers) => applyBetterAuthSessionCookies(event.cookies, headers)
			}),
		{ status: 201 }
	);
