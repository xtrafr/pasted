import { json, type RequestEvent } from '@sveltejs/kit';
import { ServiceError, toServiceError } from '$lib/server/errors';
import { logger } from '$lib/server/logger';

const RESPONSE_HEADERS = {
	'cache-control': 'no-store',
	'x-content-type-options': 'nosniff'
} as const;

type ApiEvent = Pick<RequestEvent, 'locals'>;

interface ApiOptions {
	status?: number;
}

function publicData(value: unknown): unknown {
	if (value instanceof Date || value === null || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map(publicData);

	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => key !== 'userId')
			.map(([key, fieldValue]) => [key, publicData(fieldValue)])
	);
}

export async function apiResponse<T>(
	operation: () => T | Promise<T>,
	options: ApiOptions = {}
): Promise<Response> {
	try {
		const data = await operation();
		return json(
			{
				ok: true,
				data: publicData(data)
			},
			{ status: options.status ?? 200, headers: RESPONSE_HEADERS }
		);
	} catch (error) {
		const serviceError = error instanceof ServiceError ? error : toServiceError(error);
		if (serviceError.status >= 500) {
			logger.error(
				{
					code: serviceError.code,
					errorType: error instanceof Error ? error.name : typeof error
				},
				'API request failed'
			);
		}

		return json(
			{
				ok: false,
				error: {
					code: serviceError.code,
					message: serviceError.message,
					...(serviceError.status < 500 && serviceError.details
						? { details: serviceError.details }
						: {})
				}
			},
			{ status: serviceError.status, headers: RESPONSE_HEADERS }
		);
	}
}

export function authenticatedApi<T>(
	event: ApiEvent,
	operation: (userId: string) => T | Promise<T>,
	options: ApiOptions = {}
): Promise<Response> {
	return apiResponse(() => {
		const userId = event.locals.user?.id;
		if (!userId) {
			throw new ServiceError('unauthorized', 'Authentication is required', 401);
		}
		return operation(userId);
	}, options);
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
	const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
	if (contentType !== 'application/json' && !contentType?.endsWith('+json')) {
		throw new ServiceError(
			'validation_failed',
			'The request body must use a JSON content type',
			415
		);
	}

	try {
		return (await request.json()) as T;
	} catch {
		throw new ServiceError('validation_failed', 'The request body must contain valid JSON', 400);
	}
}

export function routeParam(params: Partial<Record<string, string>>, name: string): string {
	const value = params[name];
	if (!value) {
		throw new ServiceError('validation_failed', `The ${name} route parameter is required`, 400);
	}
	return value;
}
