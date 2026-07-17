import type { RequestHandler } from './$types';
import { ServiceError } from '$lib/server/errors';
import { buildAccountExport, type ExportRequest } from '$lib/server/exports';
import { apiResponse, readJson } from '$lib/server/http/api';

export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		return apiResponse(() => {
			throw new ServiceError('unauthorized', 'Authentication is required', 401);
		});
	}

	try {
		const artifact = await buildAccountExport(userId, await readJson<ExportRequest>(request));
		const bytes =
			typeof artifact.data === 'string' ? new TextEncoder().encode(artifact.data) : artifact.data;
		const body = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(body).set(bytes);
		return new Response(body, {
			status: 200,
			headers: {
				'cache-control': 'no-store',
				'content-type': artifact.mimeType,
				'content-length': String(artifact.sizeBytes),
				'content-disposition': `attachment; filename="${artifact.filename}"`,
				'x-content-type-options': 'nosniff',
				'x-pasted-item-count': String(artifact.itemCount)
			}
		});
	} catch (error) {
		return apiResponse(() => {
			throw error;
		});
	}
};
