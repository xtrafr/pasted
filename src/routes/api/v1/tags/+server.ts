import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { createTag, listTags } from '$lib/server/services';
import type { CreateTagInput } from '$lib/server/validation';

export const GET: RequestHandler = (event) => authenticatedApi(event, (userId) => listTags(userId));

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) => createTag(userId, await readJson<CreateTagInput>(event.request)),
		{ status: 201 }
	);
