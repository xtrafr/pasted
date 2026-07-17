import type { RequestHandler } from './$types';
import { authenticatedApi, readJson } from '$lib/server/http/api';
import { createLink, listLinks } from '$lib/server/services';
import type { CreateLinkInput } from '$lib/server/validation';
import { parseTypedItemListQuery } from '../_query';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) =>
		listLinks(userId, parseTypedItemListQuery(event.url.searchParams))
	);

export const POST: RequestHandler = (event) =>
	authenticatedApi(
		event,
		async (userId) => createLink(userId, await readJson<CreateLinkInput>(event.request)),
		{ status: 201 }
	);
