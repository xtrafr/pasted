import type { RequestHandler } from './$types';
import { authenticatedApi, routeParam } from '$lib/server/http/api';
import { revokeShare } from '$lib/server/sharing';

export const DELETE: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => revokeShare(userId, routeParam(event.params, 'id')));
