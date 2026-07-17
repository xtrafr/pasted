import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { importNextBatch, type ImportBatchInput } from '$lib/server/imports';

export const POST: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		importNextBatch(
			userId,
			routeParam(event.params, 'id'),
			await readJson<ImportBatchInput>(event.request)
		)
	);
