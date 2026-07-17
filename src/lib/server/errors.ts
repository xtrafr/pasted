import { z } from 'zod';

export type ServiceErrorCode =
	| 'unauthorized'
	| 'validation_failed'
	| 'not_found'
	| 'conflict'
	| 'duplicate_link'
	| 'invalid_relation'
	| 'database_error';

export interface ValidationIssue {
	path: string;
	message: string;
}

export class ServiceError extends Error {
	readonly code: ServiceErrorCode;
	readonly status: number;
	readonly details?: Readonly<Record<string, unknown>>;

	constructor(
		code: ServiceErrorCode,
		message: string,
		status: number,
		details?: Readonly<Record<string, unknown>>,
		options?: ErrorOptions
	) {
		super(message, options);
		this.name = 'ServiceError';
		this.code = code;
		this.status = status;
		if (details !== undefined) this.details = details;
	}
}

export function validationError(error: z.ZodError): ServiceError {
	const issues: ValidationIssue[] = error.issues.map((issue) => ({
		path: issue.path.map(String).join('.'),
		message: issue.message
	}));

	return new ServiceError('validation_failed', 'The request contains invalid values', 400, {
		issues
	});
}

export function notFound(resource: string): ServiceError {
	return new ServiceError('not_found', `${resource} was not found`, 404, { resource });
}

export function conflict(
	message: string,
	details?: Readonly<Record<string, unknown>>
): ServiceError {
	return new ServiceError('conflict', message, 409, details);
}

export function duplicateLink(existingItemId: string): ServiceError {
	return new ServiceError('duplicate_link', 'This link already exists in the account', 409, {
		existingItemId
	});
}

interface PostgreSqlErrorShape {
	code?: unknown;
}

function postgresCode(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const code = (error as PostgreSqlErrorShape).code;
	return typeof code === 'string' ? code : undefined;
}

export function toServiceError(error: unknown): ServiceError {
	if (error instanceof ServiceError) return error;
	if (error instanceof z.ZodError) return validationError(error);

	switch (postgresCode(error)) {
		case '23505':
			return new ServiceError(
				'conflict',
				'A record with the same value already exists',
				409,
				undefined,
				{
					cause: error
				}
			);
		case '23503':
			return new ServiceError(
				'invalid_relation',
				'A referenced record is missing or belongs to another account',
				400,
				undefined,
				{ cause: error }
			);
		case '22P02':
			return new ServiceError(
				'validation_failed',
				'The request contains an invalid identifier',
				400,
				undefined,
				{
					cause: error
				}
			);
		default:
			return new ServiceError(
				'database_error',
				'The operation could not be completed',
				500,
				undefined,
				{
					cause: error
				}
			);
	}
}

export function requireUserId(userId: string): string {
	if (typeof userId !== 'string' || userId.trim().length === 0) {
		throw new ServiceError('unauthorized', 'Authentication is required', 401);
	}
	return userId;
}

export function parseInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown
): z.output<TSchema> {
	const result = schema.safeParse(input);
	if (!result.success) throw validationError(result.error);
	return result.data;
}
