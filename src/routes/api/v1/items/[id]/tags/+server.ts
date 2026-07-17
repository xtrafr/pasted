import type { RequestHandler } from './$types';
import { parseInput } from '$lib/server/errors';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { setItemTags } from '$lib/server/services';
import { itemTagsBodySchema } from '../../../_actions';

export const PUT: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		const body = parseInput(itemTagsBodySchema, await readJson(event.request));
		return setItemTags(userId, routeParam(event.params, 'id'), body.tagIds);
	});
