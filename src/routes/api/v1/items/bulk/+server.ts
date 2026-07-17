import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { applyBulkAction } from '$lib/server/services';
import type { BulkActionInput } from '$lib/server/validation';

export const POST: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		applyBulkAction(userId, await readJson<BulkActionInput>(event.request))
	);
