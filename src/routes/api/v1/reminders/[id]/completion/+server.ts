import type { RequestHandler } from './$types';
import { parseInput } from '$lib/server/errors';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { completeReminder } from '$lib/server/services';
import { completedBodySchema } from '../../../_actions';

export const PUT: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		const body = parseInput(completedBodySchema, await readJson(event.request));
		return completeReminder(userId, routeParam(event.params, 'id'), body.completed);
	});
