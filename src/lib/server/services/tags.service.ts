import { db } from '$lib/server/db';
import { notFound, parseInput } from '$lib/server/errors';
import { refreshSearchDocuments } from '$lib/server/repositories/items.repository';
import {
	countTagItems,
	deleteTag as deleteTagRecord,
	findOwnedTag,
	insertTag,
	listOwnedTags,
	requireOwnedTags,
	tagItemIds,
	updateTag as updateTagRecord
} from '$lib/server/repositories/taxonomy.repository';
import {
	createTagSchema,
	idSchema,
	updateTagSchema,
	type CreateTagInput,
	type UpdateTagInput
} from '$lib/server/validation';
import { scopedUserId, serviceOperation } from './internal';

export async function listTags(userId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		return listOwnedTags(db, ownerId);
	});
}

export async function getTag(userId: string, tagId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, tagId);
		const tag = await findOwnedTag(db, ownerId, id);
		if (!tag) throw notFound('Tag');
		const itemCount = await countTagItems(db, ownerId, id);
		return { ...tag, itemCount };
	});
}

export async function createTag(userId: string, input: CreateTagInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = parseInput(createTagSchema, input);
		return insertTag(db, ownerId, parsed);
	});
}

export async function updateTag(userId: string, tagId: string, input: UpdateTagInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, tagId);
		const parsed = parseInput(updateTagSchema, input);
		return db.transaction(async (tx) => {
			await requireOwnedTags(tx, ownerId, [id]);
			const itemIds = parsed.name === undefined ? [] : await tagItemIds(tx, ownerId, id);
			const updated = await updateTagRecord(tx, ownerId, id, parsed);
			if (itemIds.length > 0) await refreshSearchDocuments(tx, ownerId, itemIds);
			return { ...updated, itemCount: await countTagItems(tx, ownerId, id) };
		});
	});
}

export async function deleteTag(userId: string, tagId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, tagId);
		return db.transaction(async (tx) => {
			await requireOwnedTags(tx, ownerId, [id]);
			const itemIds = await tagItemIds(tx, ownerId, id);
			await deleteTagRecord(tx, ownerId, id);
			await refreshSearchDocuments(tx, ownerId, itemIds);
			return { affectedItems: itemIds.length };
		});
	});
}
