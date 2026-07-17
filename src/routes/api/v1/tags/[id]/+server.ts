import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { deleteTag, getTag, updateTag } from '$lib/server/services';
import type { UpdateTagInput } from '$lib/server/validation';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => getTag(userId, routeParam(event.params, 'id')));

export const PATCH: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		updateTag(userId, routeParam(event.params, 'id'), await readJson<UpdateTagInput>(event.request))
	);

export const DELETE: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => deleteTag(userId, routeParam(event.params, 'id')));
