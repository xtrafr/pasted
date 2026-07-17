import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { deleteLink, getLink, updateLink } from '$lib/server/services';
import type { UpdateLinkInput } from '$lib/server/validation';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => getLink(userId, routeParam(event.params, 'id')));

export const PATCH: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		updateLink(
			userId,
			routeParam(event.params, 'id'),
			await readJson<UpdateLinkInput>(event.request)
		)
	);

export const DELETE: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		await deleteLink(userId, routeParam(event.params, 'id'));
		return { deleted: true };
	});
