import type { RequestHandler } from './$types';
import { authenticatedApi, readJson, routeParam } from '$lib/server/http/api';
import { deleteReminder, getReminder, updateReminder } from '$lib/server/services';
import type { UpdateReminderInput } from '$lib/server/validation';

export const GET: RequestHandler = (event) =>
	authenticatedApi(event, (userId) => getReminder(userId, routeParam(event.params, 'id')));

export const PATCH: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) =>
		updateReminder(
			userId,
			routeParam(event.params, 'id'),
			await readJson<UpdateReminderInput>(event.request)
		)
	);

export const DELETE: RequestHandler = (event) =>
	authenticatedApi(event, async (userId) => {
		await deleteReminder(userId, routeParam(event.params, 'id'));
		return { deleted: true };
	});
