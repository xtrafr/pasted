import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { retryImportCandidates, type RetryImportInput } from '$lib/server/imports';

export const POST: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		retryImportCandidates(
			userId,
			routeParam(event.params, 'id'),
			await readJson<RetryImportInput>(event.request)
		)
	);
