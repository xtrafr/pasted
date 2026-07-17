import type { PageServerLoad } from './$types';
import { runtimeConfig } from '$lib/server/config';

export const load: PageServerLoad = async () => ({
	githubEnabled: Boolean(runtimeConfig.githubClientId && runtimeConfig.githubClientSecret)
});
