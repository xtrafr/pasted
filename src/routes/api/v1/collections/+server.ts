import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { createCollection, listCollections } from '$lib/server/services';
import type { CreateCollectionInput } from '$lib/server/validation';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => listCollections(userId));

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) =>
			createCollection(userId, await readJson<CreateCollectionInput>(event.request)),
		{ status: 201 }
	);
