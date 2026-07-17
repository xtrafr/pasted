import { db } from '$lib/server/db';
import { parseInput } from '$lib/server/errors';
import { refreshSearchDocuments } from '$lib/server/repositories/items.repository';
import {
	collectionItemIds,
	countCollectionItems,
	deleteCollection as deleteCollectionRecord,
	findOwnedCollection,
	insertCollection,
	listOwnedCollections,
	moveCollectionItemsToUnorganized,
	requireOwnedCollection,
	updateCollection as updateCollectionRecord
} from '$lib/server/repositories/taxonomy.repository';
import {
	createCollectionSchema,
	idSchema,
	updateCollectionSchema,
	type CreateCollectionInput,
	type UpdateCollectionInput
} from '$lib/server/validation';
import { notFound } from '$lib/server/errors';
import { scopedUserId, serviceOperation } from './internal';

export async function listCollections(userId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		return listOwnedCollections(db, ownerId);
	});
}

export async function getCollection(userId: string, collectionId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, collectionId);
		const collection = await findOwnedCollection(db, ownerId, id);
		if (!collection) throw notFound('Collection');
		const itemCount = await countCollectionItems(db, ownerId, id);
		return { ...collection, itemCount };
	});
}

export async function createCollection(userId: string, input: CreateCollectionInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = parseInput(createCollectionSchema, input);
		return insertCollection(db, ownerId, parsed);
	});
}

export async function updateCollection(
	userId: string,
	collectionId: string,
	input: UpdateCollectionInput
) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, collectionId);
		const parsed = parseInput(updateCollectionSchema, input);
		return db.transaction(async (tx) => {
			await requireOwnedCollection(tx, ownerId, id);
			const itemIds = parsed.name === undefined ? [] : await collectionItemIds(tx, ownerId, id);
			const updated = await updateCollectionRecord(tx, ownerId, id, parsed);
			if (itemIds.length > 0) await refreshSearchDocuments(tx, ownerId, itemIds);
			return { ...updated, itemCount: await countCollectionItems(tx, ownerId, id) };
		});
	});
}

export async function deleteCollection(userId: string, collectionId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, collectionId);
		return db.transaction(async (tx) => {
			await requireOwnedCollection(tx, ownerId, id);
			const itemIds = await collectionItemIds(tx, ownerId, id);
			const movedItems = await moveCollectionItemsToUnorganized(tx, ownerId, id);
			await deleteCollectionRecord(tx, ownerId, id);
			await refreshSearchDocuments(tx, ownerId, itemIds);
			return { movedItems };
		});
	});
}
