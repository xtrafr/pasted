import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { createImportSession, type CreateImportInput } from '$lib/server/imports';

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) => createImportSession(userId, await readJson<CreateImportInput>(event.request)),
		{ status: 201 }
	);
