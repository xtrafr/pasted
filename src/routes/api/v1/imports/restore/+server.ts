import type { RequestHandler } from './$types';
import { restorePastedBackup, type RestoreBackupInput } from '$lib/server/backups';
import { authenticatedApi, readJson } from '$lib/server/http/api';

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) =>
			restorePastedBackup(userId, await readJson<RestoreBackupInput>(event.request)),
		{ status: 201 }
	);
