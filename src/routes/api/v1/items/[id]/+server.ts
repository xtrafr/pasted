import type { RequestHandler } from './$types';
import { authenticatedApi, routeParam } from '$lib/server/http/api';
import { deleteItem, getItem } from '$lib/server/services';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => getItem(userId, routeParam(event.params, 'id')));

export const DELETE: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		await deleteItem(userId, routeParam(event.params, 'id'));
		return { deleted: true };
	});
