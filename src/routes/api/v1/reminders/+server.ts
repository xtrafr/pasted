import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { createReminder, listReminders } from '$lib/server/services';
import type { CreateReminderInput } from '$lib/server/validation';
import { parseTypedItemListQuery } from '../_query';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) =>
		listReminders(userId, parseTypedItemListQuery(event.url.searchParams))
	);

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) => createReminder(userId, await readJson<CreateReminderInput>(event.request)),
		{ status: 201 }
	);
