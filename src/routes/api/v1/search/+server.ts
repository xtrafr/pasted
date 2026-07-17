import type { RequestHandler } from './$types';
import { authenticatedApi } from '$lib/server/http/api';
import { listItems } from '$lib/server/services';
import { parseSearchQuery } from '../_query';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => listItems(userId, parseSearchQuery(event.url.searchParams)));
