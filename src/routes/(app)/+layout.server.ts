import { redirect } from '@sveltejs/kit';
import { listCollections, listTags } from '$lib/server/services';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session) redirect(303, '/login');
	const [collections, tags] = await Promise.all([
		listCollections(locals.user.id),
		listTags(locals.user.id)
	]);

	return {
		user: { id: locals.user.id, name: locals.user.name },
		collections,
		tags
	};
};
