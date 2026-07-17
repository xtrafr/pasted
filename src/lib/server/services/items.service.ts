import { z } from 'zod';
import { db } from '$lib/server/db';
import { parseInput } from '$lib/server/errors';
import {
	addItemTags,
	deleteOwnedItem,
	deleteOwnedItems,
	getTagsForItems,
	listOwnedItems,
	refreshSearchDocuments,
	removeItemTags,
	replaceItemTags,
	requireOwnedItemIds,
	updateOwnedItems
} from '$lib/server/repositories/items.repository';
import {
	requireOwnedCollection,
	requireOwnedTags
} from '$lib/server/repositories/taxonomy.repository';
import {
	bulkActionSchema,
	idSchema,
	listItemsSchema,
	tagIdsSchema,
	type BulkActionInput,
	type ListItemsInput
} from '$lib/server/validation';
import {
	decodeListCursor,
	encodeListCursor,
	loadOwnedItem,
	scopedUserId,
	serviceOperation
} from './internal';

export async function getItem(userId: string, itemId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		return loadOwnedItem(db, ownerId, id);
	});
}

export async function listItems(userId: string, input: ListItemsInput = {}) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = parseInput(listItemsSchema, input);
		const cursor = decodeListCursor(parsed.cursor, parsed);
		const rows = await listOwnedItems(db, ownerId, parsed, cursor);
		const hasMore = rows.length > parsed.limit;
		if (hasMore) rows.pop();

		const tagRows = await getTagsForItems(
			db,
			ownerId,
			rows.map((row) => row.id)
		);
		const tagsByItem = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
		for (const row of tagRows) {
			const list = tagsByItem.get(row.itemId) ?? [];
			list.push({ id: row.id, name: row.name, color: row.color });
			tagsByItem.set(row.itemId, list);
		}

		const resultItems = rows.map(({ sortValue, ...row }) => {
			void sortValue;
			return { ...row, tags: tagsByItem.get(row.id) ?? [] };
		});
		const last = rows.at(-1);
		return {
			items: resultItems,
			hasMore,
			nextCursor: hasMore && last ? encodeListCursor(last.id, last.sortValue, parsed) : undefined
		};
	});
}

export async function deleteItem(userId: string, itemId: string): Promise<void> {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		await db.transaction((tx) => deleteOwnedItem(tx, ownerId, id));
	});
}

export async function setItemFavorite(userId: string, itemId: string, favorite: boolean) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		const value = parseInput(parseInputBooleanSchema, favorite);
		return db.transaction(async (tx) => {
			await requireOwnedItemIds(tx, ownerId, [id]);
			await updateOwnedItems(tx, ownerId, [id], { favorite: value });
			return loadOwnedItem(tx, ownerId, id);
		});
	});
}

export async function setItemArchived(userId: string, itemId: string, archived: boolean) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		const value = parseInput(parseInputBooleanSchema, archived);
		return db.transaction(async (tx) => {
			await requireOwnedItemIds(tx, ownerId, [id]);
			await updateOwnedItems(tx, ownerId, [id], { archived: value });
			return loadOwnedItem(tx, ownerId, id);
		});
	});
}

export async function setItemTags(userId: string, itemId: string, input: unknown) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		const tagIds = parseInput(tagIdsSchema, input);
		return db.transaction(async (tx) => {
			await requireOwnedItemIds(tx, ownerId, [id]);
			await requireOwnedTags(tx, ownerId, tagIds);
			await replaceItemTags(tx, ownerId, id, tagIds);
			await refreshSearchDocuments(tx, ownerId, [id]);
			return loadOwnedItem(tx, ownerId, id);
		});
	});
}

export async function applyBulkAction(userId: string, input: BulkActionInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = parseInput(bulkActionSchema, input);

		return db.transaction(async (tx) => {
			await requireOwnedItemIds(tx, ownerId, parsed.itemIds);
			switch (parsed.action) {
				case 'favorite':
					return {
						affected: await updateOwnedItems(tx, ownerId, parsed.itemIds, { favorite: true })
					};
				case 'unfavorite':
					return {
						affected: await updateOwnedItems(tx, ownerId, parsed.itemIds, { favorite: false })
					};
				case 'archive':
					return {
						affected: await updateOwnedItems(tx, ownerId, parsed.itemIds, { archived: true })
					};
				case 'unarchive':
					return {
						affected: await updateOwnedItems(tx, ownerId, parsed.itemIds, { archived: false })
					};
				case 'delete':
					return { affected: await deleteOwnedItems(tx, ownerId, parsed.itemIds) };
				case 'move_collection': {
					if (parsed.collectionId) await requireOwnedCollection(tx, ownerId, parsed.collectionId);
					const affected = await updateOwnedItems(tx, ownerId, parsed.itemIds, {
						collectionId: parsed.collectionId
					});
					await refreshSearchDocuments(tx, ownerId, parsed.itemIds);
					return { affected };
				}
				case 'add_tags':
					await requireOwnedTags(tx, ownerId, parsed.tagIds);
					await addItemTags(tx, ownerId, parsed.itemIds, parsed.tagIds);
					await refreshSearchDocuments(tx, ownerId, parsed.itemIds);
					return { affected: parsed.itemIds.length };
				case 'remove_tags':
					await requireOwnedTags(tx, ownerId, parsed.tagIds);
					await removeItemTags(tx, ownerId, parsed.itemIds, parsed.tagIds);
					await refreshSearchDocuments(tx, ownerId, parsed.itemIds);
					return { affected: parsed.itemIds.length };
			}
		});
	});
}

const parseInputBooleanSchema = z.boolean();
