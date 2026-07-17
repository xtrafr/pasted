import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ServiceError } from '$lib/server/errors';
import { resolvePublicShare } from '$lib/server/sharing';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'x-content-type-options': 'nosniff',
		'x-robots-tag': 'noindex, nofollow, noarchive'
	});

	try {
		return { shared: await resolvePublicShare(params.token) };
	} catch (cause) {
		if (cause instanceof ServiceError && cause.status === 404) {
			error(404, 'This shared page is unavailable');
		}
		throw cause;
	}
};
