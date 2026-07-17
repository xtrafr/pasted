import type { PageServerLoad } from './$types';
import { ServiceError } from '$lib/server/errors';
import { exportOverview } from '$lib/server/exports';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user?.id;
	if (!userId) throw new ServiceError('unauthorized', 'Authentication is required', 401);
	return {
		overview: await exportOverview(userId),
		itemIds: url.searchParams.getAll('id').slice(0, 10_000),
		searchQuery: url.searchParams.get('search')?.trim().slice(0, 300) ?? ''
	};
};
