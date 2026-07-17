import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import {
	getImportSession,
	updateImportReview,
	type UpdateImportReviewInput
} from '$lib/server/imports';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => getImportSession(userId, routeParam(event.params, 'id')));

export const PATCH: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		updateImportReview(
			userId,
			routeParam(event.params, 'id'),
			await readJson<UpdateImportReviewInput>(event.request)
		)
	);
