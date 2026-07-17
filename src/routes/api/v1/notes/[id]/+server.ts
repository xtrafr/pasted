import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { deleteNote, getNote, updateNote } from '$lib/server/services';
import type { UpdateNoteInput } from '$lib/server/validation';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => getNote(userId, routeParam(event.params, 'id')));

export const PATCH: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		updateNote(
			userId,
			routeParam(event.params, 'id'),
			await readJson<UpdateNoteInput>(event.request)
		)
	);

export const DELETE: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		await deleteNote(userId, routeParam(event.params, 'id'));
		return { deleted: true };
	});
