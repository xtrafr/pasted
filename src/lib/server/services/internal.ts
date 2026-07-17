import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { normalizeUrl } from '$lib/import/urls';
import { importSessions } from '$lib/server/db/schema';
import {
	ServiceError,
	notFound,
	parseInput,
	requireUserId,
	toServiceError
} from '$lib/server/errors';
import {
	findOwnedItem,
	getTagsForItems,
	requireOwnedItem,
	type ListCursor
} from '$lib/server/repositories/items.repository';
import {
	requireOwnedCollection,
	requireOwnedTags
} from '$lib/server/repositories/taxonomy.repository';
import type { DatabaseExecutor } from '$lib/server/repositories/types';
import type { ParsedListItemsInput } from '$lib/server/validation';

export async function serviceOperation<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw toServiceError(error);
	}
}

export function scopedUserId(userId: string): string {
	return requireUserId(userId);
}

export async function validateRelations(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string | null | undefined,
	tagIds: readonly string[] | undefined
): Promise<void> {
	if (collectionId) await requireOwnedCollection(executor, userId, collectionId);
	if (tagIds !== undefined) await requireOwnedTags(executor, userId, tagIds);
}

export async function requireOwnedImportSession(
	executor: DatabaseExecutor,
	userId: string,
	importSessionId: string
): Promise<void> {
	const [row] = await executor
		.select({ id: importSessions.id })
		.from(importSessions)
		.where(and(eq(importSessions.userId, userId), eq(importSessions.id, importSessionId)))
		.limit(1);
	if (!row) throw notFound('Import session');
}

export interface NormalizedServiceUrl {
	originalUrl: string;
	normalizedUrl: string;
	domain: string;
}

export function normalizeServiceUrl(originalUrl: string): NormalizedServiceUrl {
	const result = normalizeUrl(originalUrl, { maxUrlLength: 8_192 });
	if (!result.normalizedUrl || !result.domain || result.issues.length > 0) {
		throw new ServiceError('validation_failed', 'The link URL is invalid or unsupported', 400, {
			issues: result.issues
		});
	}

	const parsed = new URL(result.normalizedUrl);
	if (parsed.username || parsed.password) {
		throw new ServiceError(
			'validation_failed',
			'URLs containing credentials are not allowed',
			400,
			{
				issues: [{ path: 'originalUrl', message: 'Remove the username and password from the URL' }]
			}
		);
	}

	return {
		originalUrl: result.inputUrl,
		normalizedUrl: result.normalizedUrl,
		domain: result.domain
	};
}

export async function loadOwnedItem(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	expectedType?: 'link' | 'note' | 'reminder'
) {
	const row =
		expectedType === undefined
			? await findOwnedItem(executor, userId, itemId)
			: await requireOwnedItem(executor, userId, itemId, expectedType);
	if (!row) throw notFound('Item');
	const itemTagRows = await getTagsForItems(executor, userId, [itemId]);
	return {
		...row,
		tags: itemTagRows.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }))
	};
}

const cursorPayloadSchema = z
	.object({
		itemId: z.string().uuid(),
		value: z.string().max(500),
		sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'domain', 'dueAt']),
		sortDirection: z.enum(['asc', 'desc'])
	})
	.strict();

export function decodeListCursor(
	cursor: string | undefined,
	input: ParsedListItemsInput
): ListCursor | undefined {
	if (!cursor) return undefined;
	let decoded: unknown;
	try {
		decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
	} catch {
		throw new ServiceError('validation_failed', 'The pagination cursor is invalid', 400);
	}
	const payload = parseInput(cursorPayloadSchema, decoded);
	if (payload.sortBy !== input.sortBy || payload.sortDirection !== input.sortDirection) {
		throw new ServiceError(
			'validation_failed',
			'The pagination cursor does not match the sort',
			400
		);
	}
	if (
		payload.sortBy !== 'title' &&
		payload.sortBy !== 'domain' &&
		Number.isNaN(Date.parse(payload.value))
	) {
		throw new ServiceError(
			'validation_failed',
			'The pagination cursor contains an invalid date',
			400
		);
	}
	return { itemId: payload.itemId, value: payload.value };
}

export function encodeListCursor(
	itemId: string,
	value: string | Date,
	input: ParsedListItemsInput
): string {
	const encodedValue = value instanceof Date ? value.toISOString() : String(value);
	return Buffer.from(
		JSON.stringify({
			itemId,
			value: encodedValue,
			sortBy: input.sortBy,
			sortDirection: input.sortDirection
		})
	).toString('base64url');
}
