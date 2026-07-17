import type { RequestHandler } from './$types';
import { ServiceError } from '$lib/server/errors';
import { apiResponse, routeParam } from '$lib/server/http/api';
import { getOwnedMetadataAsset } from '$lib/server/jobs';

export const GET: RequestHandler = async (event) => {
	try {
		const userId = event.locals.user?.id;
		if (!userId) throw new ServiceError('unauthorized', 'Authentication is required', 401);
		const asset = await getOwnedMetadataAsset(userId, routeParam(event.params, 'id'));
		return new Response(new Uint8Array(asset.bytes), {
			headers: {
				'cache-control': 'private, max-age=86400, immutable',
				'content-length': String(asset.sizeBytes),
				'content-type': asset.mimeType,
				etag: `"${asset.sha256}"`,
				'x-content-type-options': 'nosniff'
			}
		});
	} catch (error) {
		return apiResponse(() => {
			throw error;
		});
	}
};
