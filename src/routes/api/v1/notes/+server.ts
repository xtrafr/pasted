import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { createNote, listNotes } from '$lib/server/services';
import type { CreateNoteInput } from '$lib/server/validation';
import { parseTypedItemListQuery } from '../_query';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) =>
		listNotes(userId, parseTypedItemListQuery(event.url.searchParams))
	);

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) => createNote(userId, await readJson<CreateNoteInput>(event.request)),
		{ status: 201 }
	);
