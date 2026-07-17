import type { RequestHandler } from './$types';
import { authenticatedApi, routeParam } from '$lib/server/http/api';
import { cancelImport } from '$lib/server/imports';

export const POST: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => cancelImport(userId, routeParam(event.params, 'id')));
