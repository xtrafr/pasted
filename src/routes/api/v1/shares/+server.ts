import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { createShare, listShares, type CreateShareInput } from '$lib/server/sharing';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => listShares(userId));

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) => createShare(userId, await readJson<CreateShareInput>(event.request)),
		{ status: 201 }
	);
