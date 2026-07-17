import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { deleteCollection, getCollection, updateCollection } from '$lib/server/services';
import type { UpdateCollectionInput } from '$lib/server/validation';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => getCollection(userId, routeParam(event.params, 'id')));

export const PATCH: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		updateCollection(
			userId,
			routeParam(event.params, 'id'),
			await readJson<UpdateCollectionInput>(event.request)
		)
	);

export const DELETE: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => deleteCollection(userId, routeParam(event.params, 'id')));
