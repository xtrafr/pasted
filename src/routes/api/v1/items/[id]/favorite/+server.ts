import type { RequestHandler } from './$types';
import { parseInput } from '$lib/server/errors';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { setItemFavorite } from '$lib/server/services';
import { favoriteBodySchema } from '../../../_actions';

export const PUT: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		const body = parseInput(favoriteBodySchema, await readJson(event.request));
		return setItemFavorite(userId, routeParam(event.params, 'id'), body.favorite);
	});
