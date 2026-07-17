import type { RequestHandler } from './$types';
import { authenticatedApi, routeParam } from '$lib/server/http/api';
import { enqueueOwnedMetadata, getOwnedMetadataStatus } from '$lib/server/jobs';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) =>
		getOwnedMetadataStatus(userId, routeParam(event.params, 'targetId'))
	);

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		(userId) =>
			enqueueOwnedMetadata(userId, {
				targetId: routeParam(event.params, 'targetId'),
				force: event.url.searchParams.get('force') === 'true'
			}),
		{ status: 202 }
	);
