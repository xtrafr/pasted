import type { RequestHandler } from './$types';
import { parseInput } from '$lib/server/errors';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { setItemArchived } from '$lib/server/services';
import { archivedBodySchema } from '../../../_actions';

export const PUT: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		const body = parseInput(archivedBodySchema, await readJson(event.request));
		return setItemArchived(userId, routeParam(event.params, 'id'), body.archived);
	});
