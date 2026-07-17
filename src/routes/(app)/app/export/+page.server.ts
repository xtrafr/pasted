import type { PageServerLoad } from './$types';
import { ServiceError } from '$lib/server/errors';
import { exportOverview } from '$lib/server/exports';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user?.id;
	if (!userId) throw new ServiceError('unauthorized', 'Authentication is required', 401);
	const view = url.searchParams.get('view') ?? 'all';
	const type = url.searchParams.get('type');
	const collection = url.searchParams.get('collection');
	const domain = url.searchParams.get('domain')?.trim().toLowerCase();
	const sourceImportId = url.searchParams.get('sourceImport')?.trim();
	const createdFrom = url.searchParams.get('createdFrom')?.trim();
	const createdTo = url.searchParams.get('createdTo')?.trim();
	const types =
		view === 'reminders'
			? (['reminder'] as const)
			: type === 'link' || type === 'note' || type === 'reminder'
				? [type]
				: [];
	return {
		overview: await exportOverview(userId),
		itemIds: url.searchParams.getAll('id').slice(0, 10_000),
		searchQuery: url.searchParams.get('search')?.trim().slice(0, 300) ?? '',
		searchFilters: {
			archived: view === 'archived',
			...(view === 'favorites' ? { favorite: true } : {}),
			...(types.length ? { types: [...types] } : {}),
			...(collection ? { collectionId: collection === 'unorganized' ? null : collection } : {}),
			...(domain ? { domain } : {}),
			...(sourceImportId ? { sourceImportId } : {}),
			...(createdFrom ? { createdFrom } : {}),
			...(createdTo ? { createdTo } : {}),
			tagIds: url.searchParams.getAll('tag').slice(0, 50),
			tagMode: 'all' as const
		}
	};
};
