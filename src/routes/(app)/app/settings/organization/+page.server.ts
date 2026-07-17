import { ServiceError } from '$lib/server/errors';
import { listCollections, listTags } from '$lib/server/services';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user?.id;
	if (!userId) throw new ServiceError('unauthorized', 'Authentication is required', 401);

	const [collections, tags] = await Promise.all([listCollections(userId), listTags(userId)]);

	return { collections, tags };
};
