import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { collections, items, itemTags, tags } from '$lib/server/db/schema';
import { notFound } from '$lib/server/errors';
import type {
	ParsedCreateCollectionInput,
	ParsedCreateTagInput,
	ParsedUpdateCollectionInput,
	ParsedUpdateTagInput
} from '$lib/server/validation';
import type { DatabaseExecutor } from './types';

export async function listOwnedCollections(executor: DatabaseExecutor, userId: string) {
	return executor
		.select({
			id: collections.id,
			name: collections.name,
			description: collections.description,
			color: collections.color,
			icon: collections.icon,
			sortOrder: collections.sortOrder,
			sortMode: collections.sortMode,
			createdAt: collections.createdAt,
			updatedAt: collections.updatedAt,
			itemCount: sql<number>`(
				select count(*)::int from ${items}
				where ${items.userId} = ${userId} and ${items.collectionId} = ${collections.id}
			)`
		})
		.from(collections)
		.where(eq(collections.userId, userId))
		.orderBy(asc(collections.sortOrder), asc(collections.name), asc(collections.id));
}

export async function findOwnedCollection(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string
) {
	const [row] = await executor
		.select()
		.from(collections)
		.where(and(eq(collections.userId, userId), eq(collections.id, collectionId)))
		.limit(1);
	return row;
}

export async function requireOwnedCollection(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string
) {
	const row = await findOwnedCollection(executor, userId, collectionId);
	if (!row) throw notFound('Collection');
	return row;
}

export async function insertCollection(
	executor: DatabaseExecutor,
	userId: string,
	input: ParsedCreateCollectionInput
) {
	const [created] = await executor
		.insert(collections)
		.values({ userId, ...input })
		.returning();
	if (!created) throw new Error('Insert did not return a collection');
	return created;
}

export async function updateCollection(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string,
	input: ParsedUpdateCollectionInput
) {
	const [updated] = await executor
		.update(collections)
		.set({ ...input, updatedAt: new Date() })
		.where(and(eq(collections.userId, userId), eq(collections.id, collectionId)))
		.returning();
	if (!updated) throw notFound('Collection');
	return updated;
}

export async function collectionItemIds(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string
): Promise<string[]> {
	const rows = await executor
		.select({ id: items.id })
		.from(items)
		.where(and(eq(items.userId, userId), eq(items.collectionId, collectionId)));
	return rows.map((row) => row.id);
}

export async function countCollectionItems(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string
): Promise<number> {
	const [row] = await executor
		.select({ count: sql<number>`count(*)::int` })
		.from(items)
		.where(and(eq(items.userId, userId), eq(items.collectionId, collectionId)));
	return row?.count ?? 0;
}

export async function moveCollectionItemsToUnorganized(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string
): Promise<number> {
	const moved = await executor
		.update(items)
		.set({ collectionId: null, updatedAt: new Date() })
		.where(and(eq(items.userId, userId), eq(items.collectionId, collectionId)))
		.returning({ id: items.id });
	return moved.length;
}

export async function deleteCollection(
	executor: DatabaseExecutor,
	userId: string,
	collectionId: string
): Promise<void> {
	const deleted = await executor
		.delete(collections)
		.where(and(eq(collections.userId, userId), eq(collections.id, collectionId)))
		.returning({ id: collections.id });
	if (deleted.length === 0) throw notFound('Collection');
}

export async function listOwnedTags(executor: DatabaseExecutor, userId: string) {
	return executor
		.select({
			id: tags.id,
			name: tags.name,
			color: tags.color,
			createdAt: tags.createdAt,
			updatedAt: tags.updatedAt,
			itemCount: sql<number>`(
				select count(*)::int from ${itemTags}
				where ${itemTags.userId} = ${userId} and ${itemTags.tagId} = ${tags.id}
			)`
		})
		.from(tags)
		.where(eq(tags.userId, userId))
		.orderBy(asc(tags.name), asc(tags.id));
}

export async function findOwnedTag(executor: DatabaseExecutor, userId: string, tagId: string) {
	const [row] = await executor
		.select()
		.from(tags)
		.where(and(eq(tags.userId, userId), eq(tags.id, tagId)))
		.limit(1);
	return row;
}

export async function requireOwnedTags(
	executor: DatabaseExecutor,
	userId: string,
	tagIds: readonly string[]
): Promise<void> {
	if (tagIds.length === 0) return;
	const rows = await executor
		.select({ id: tags.id })
		.from(tags)
		.where(and(eq(tags.userId, userId), inArray(tags.id, [...tagIds])));
	if (rows.length !== tagIds.length) throw notFound('One or more tags');
}

export async function insertTag(
	executor: DatabaseExecutor,
	userId: string,
	input: ParsedCreateTagInput
) {
	const [created] = await executor
		.insert(tags)
		.values({ userId, ...input })
		.returning();
	if (!created) throw new Error('Insert did not return a tag');
	return created;
}

export async function updateTag(
	executor: DatabaseExecutor,
	userId: string,
	tagId: string,
	input: ParsedUpdateTagInput
) {
	const [updated] = await executor
		.update(tags)
		.set({ ...input, updatedAt: new Date() })
		.where(and(eq(tags.userId, userId), eq(tags.id, tagId)))
		.returning();
	if (!updated) throw notFound('Tag');
	return updated;
}

export async function tagItemIds(
	executor: DatabaseExecutor,
	userId: string,
	tagId: string
): Promise<string[]> {
	const rows = await executor
		.select({ itemId: itemTags.itemId })
		.from(itemTags)
		.where(and(eq(itemTags.userId, userId), eq(itemTags.tagId, tagId)));
	return rows.map((row) => row.itemId);
}

export async function countTagItems(
	executor: DatabaseExecutor,
	userId: string,
	tagId: string
): Promise<number> {
	const [row] = await executor
		.select({ count: sql<number>`count(*)::int` })
		.from(itemTags)
		.where(and(eq(itemTags.userId, userId), eq(itemTags.tagId, tagId)));
	return row?.count ?? 0;
}

export async function deleteTag(
	executor: DatabaseExecutor,
	userId: string,
	tagId: string
): Promise<void> {
	const deleted = await executor
		.delete(tags)
		.where(and(eq(tags.userId, userId), eq(tags.id, tagId)))
		.returning({ id: tags.id });
	if (deleted.length === 0) throw notFound('Tag');
}
