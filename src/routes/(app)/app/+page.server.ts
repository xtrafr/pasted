import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ServiceError } from '$lib/server/errors';
import {
	applyBulkAction,
	createCollection,
	createLink,
	createNote,
	createReminder,
	createTag,
	listCollections,
	listItems,
	listTags
} from '$lib/server/services';
import type { ListItemsInput } from '$lib/server/validation';

function requiredUserId(locals: App.Locals): string {
	if (!locals.user) throw new ServiceError('unauthorized', 'Authentication is required', 401);
	return locals.user.id;
}

function optionalText(form: FormData, key: string): string | undefined {
	const value = form.get(key);
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function nullableText(form: FormData, key: string): string | null | undefined {
	const value = form.get(key);
	if (value === null) return undefined;
	if (typeof value !== 'string') return undefined;
	return value.trim() || null;
}

function checked(form: FormData, key: string): boolean {
	return form.get(key) === 'on' || form.get(key) === 'true';
}

function tagIds(form: FormData): string[] {
	return form
		.getAll('tagIds')
		.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function actionFailure(error: unknown) {
	if (error instanceof ServiceError) {
		return fail(error.status, {
			success: false as const,
			code: error.code,
			message: error.message,
			details: error.details
		});
	}

	return fail(500, {
		success: false as const,
		code: 'unexpected_error',
		message: 'The operation could not be completed.'
	});
}

function listInput(url: URL): ListItemsInput {
	const view = url.searchParams.get('view') ?? 'all';
	const type = url.searchParams.get('type');
	const collection = url.searchParams.get('collection');
	const tagValues = url.searchParams.getAll('tag');
	const sort = url.searchParams.get('sort');
	const direction = url.searchParams.get('direction');
	const query = url.searchParams.get('q')?.trim();
	const input: ListItemsInput = {
		archived: view === 'archived',
		sortDirection: direction === 'asc' ? ('asc' as const) : ('desc' as const),
		sortBy:
			sort === 'updatedAt' || sort === 'title' || sort === 'domain' || sort === 'dueAt'
				? sort
				: 'createdAt',
		limit: 60
	};
	if (query) input.query = query;
	if (type === 'link' || type === 'note' || type === 'reminder') input.types = [type];
	if (view === 'reminders') input.types = ['reminder'];
	if (view === 'favorites') input.favorite = true;
	if (collection === 'unorganized') input.collectionId = null;
	else if (collection) input.collectionId = collection;
	if (tagValues.length) input.tagIds = tagValues;
	const cursor = url.searchParams.get('cursor');
	if (cursor) input.cursor = cursor;
	return input;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requiredUserId(locals);
	const [library, collections, tags] = await Promise.all([
		listItems(userId, listInput(url)),
		listCollections(userId),
		listTags(userId)
	]);

	return {
		library,
		collections,
		tags,
		filters: {
			view: url.searchParams.get('view') ?? 'all',
			query: url.searchParams.get('q') ?? '',
			type: url.searchParams.get('type') ?? '',
			collection: url.searchParams.get('collection') ?? '',
			tagIds: url.searchParams.getAll('tag'),
			sort: url.searchParams.get('sort') ?? 'createdAt',
			direction: url.searchParams.get('direction') ?? 'desc'
		}
	};
};

export const actions: Actions = {
	createLink: async ({ locals, request }) => {
		try {
			const form = await request.formData();
			const item = await createLink(requiredUserId(locals), {
				originalUrl: String(form.get('url') ?? ''),
				title: nullableText(form, 'title'),
				description: nullableText(form, 'description'),
				personalNotes: nullableText(form, 'personalNotes'),
				collectionId: nullableText(form, 'collectionId'),
				tagIds: tagIds(form),
				favorite: checked(form, 'favorite')
			});
			return { success: true as const, kind: 'link', itemId: item.id };
		} catch (error) {
			return actionFailure(error);
		}
	},

	createNote: async ({ locals, request }) => {
		try {
			const form = await request.formData();
			const item = await createNote(requiredUserId(locals), {
				title: nullableText(form, 'title'),
				body: String(form.get('body') ?? ''),
				collectionId: nullableText(form, 'collectionId'),
				tagIds: tagIds(form),
				favorite: checked(form, 'favorite')
			});
			return { success: true as const, kind: 'note', itemId: item.id };
		} catch (error) {
			return actionFailure(error);
		}
	},

	createReminder: async ({ locals, request }) => {
		try {
			const form = await request.formData();
			const dueAt = optionalText(form, 'dueAt');
			const item = await createReminder(requiredUserId(locals), {
				title: String(form.get('title') ?? ''),
				description: nullableText(form, 'description'),
				dueAt: dueAt ? new Date(dueAt).toISOString() : '',
				recurrence: nullableText(form, 'recurrence'),
				timeZone: optionalText(form, 'timeZone') ?? 'UTC',
				collectionId: nullableText(form, 'collectionId'),
				tagIds: tagIds(form)
			});
			return { success: true as const, kind: 'reminder', itemId: item.id };
		} catch (error) {
			return actionFailure(error);
		}
	},

	createCollection: async ({ locals, request }) => {
		try {
			const form = await request.formData();
			const collection = await createCollection(requiredUserId(locals), {
				name: String(form.get('name') ?? ''),
				description: nullableText(form, 'description'),
				color: nullableText(form, 'color'),
				icon: nullableText(form, 'icon')
			});
			return { success: true as const, kind: 'collection', itemId: collection.id };
		} catch (error) {
			return actionFailure(error);
		}
	},

	createTag: async ({ locals, request }) => {
		try {
			const form = await request.formData();
			const tag = await createTag(requiredUserId(locals), {
				name: String(form.get('name') ?? ''),
				color: nullableText(form, 'color')
			});
			return { success: true as const, kind: 'tag', itemId: tag.id };
		} catch (error) {
			return actionFailure(error);
		}
	},

	bulk: async ({ locals, request }) => {
		try {
			const form = await request.formData();
			const itemIds = form
				.getAll('itemIds')
				.filter((value): value is string => typeof value === 'string');
			const action = String(form.get('bulkAction') ?? '');
			const extra =
				action === 'move_collection'
					? { collectionId: nullableText(form, 'collectionId') ?? null }
					: action === 'add_tags' || action === 'remove_tags'
						? { tagIds: tagIds(form) }
						: {};
			const result = await applyBulkAction(requiredUserId(locals), {
				action,
				itemIds,
				...extra
			} as Parameters<typeof applyBulkAction>[1]);
			return { success: true as const, kind: 'bulk', affected: result.affected };
		} catch (error) {
			return actionFailure(error);
		}
	}
};
