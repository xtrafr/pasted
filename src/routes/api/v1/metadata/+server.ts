import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { enqueueOwnedMetadata } from '$lib/server/jobs';

interface MetadataRequestBody {
	targetId: string;
	force?: boolean;
}

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) =>
			enqueueOwnedMetadata(userId, await readJson<MetadataRequestBody>(event.request)),
		{ status: 202 }
	);
