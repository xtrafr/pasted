import { db } from '$lib/server/db';
import { parseInput } from '$lib/server/errors';
import { insertNoteDetails, updateNoteDetails } from '$lib/server/repositories/content.repository';
import {
	deleteOwnedItem,
	insertBaseItem,
	refreshSearchDocuments,
	replaceItemTags,
	requireOwnedItem,
	updateBaseItem,
	type BaseItemPatch
} from '$lib/server/repositories/items.repository';
import {
	createNoteSchema,
	idSchema,
	updateNoteSchema,
	type CreateNoteInput,
	type ListItemsInput,
	type UpdateNoteInput
} from '$lib/server/validation';
import { loadOwnedItem, scopedUserId, serviceOperation, validateRelations } from './internal';
import { listItems } from './items.service';

export async function listNotes(userId: string, input: Omit<ListItemsInput, 'types'> = {}) {
	return listItems(userId, { ...input, types: ['note'] });
}

export async function createNote(userId: string, input: CreateNoteInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = parseInput(createNoteSchema, input);
		return db.transaction(async (tx) => {
			await validateRelations(tx, ownerId, parsed.collectionId, parsed.tagIds);
			const item = await insertBaseItem(tx, ownerId, {
				type: 'note',
				title: parsed.title ?? null,
				collectionId: parsed.collectionId ?? null,
				favorite: parsed.favorite ?? false,
				archived: parsed.archived ?? false,
				sourceDate: parsed.sourceDate ?? null
			});
			await insertNoteDetails(tx, ownerId, item.id, parsed.body);
			if (parsed.tagIds) await replaceItemTags(tx, ownerId, item.id, parsed.tagIds);
			await refreshSearchDocuments(tx, ownerId, [item.id]);
			return loadOwnedItem(tx, ownerId, item.id, 'note');
		});
	});
}

export async function getNote(userId: string, itemId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		return loadOwnedItem(db, ownerId, id, 'note');
	});
}

export async function updateNote(userId: string, itemId: string, input: UpdateNoteInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		const parsed = parseInput(updateNoteSchema, input);
		return db.transaction(async (tx) => {
			await requireOwnedItem(tx, ownerId, id, 'note');
			await validateRelations(tx, ownerId, parsed.collectionId, parsed.tagIds);
			const patch: BaseItemPatch = {};
			if (parsed.title !== undefined) patch.title = parsed.title;
			if (parsed.description !== undefined) patch.description = parsed.description;
			if (parsed.collectionId !== undefined) patch.collectionId = parsed.collectionId;
			if (parsed.favorite !== undefined) patch.favorite = parsed.favorite;
			if (parsed.archived !== undefined) patch.archived = parsed.archived;
			if (parsed.state !== undefined) patch.state = parsed.state;
			if (parsed.sourceDate !== undefined) patch.sourceDate = parsed.sourceDate;
			await updateBaseItem(tx, ownerId, id, patch);
			if (parsed.body !== undefined) await updateNoteDetails(tx, ownerId, id, parsed.body);
			if (parsed.tagIds !== undefined) await replaceItemTags(tx, ownerId, id, parsed.tagIds);
			await refreshSearchDocuments(tx, ownerId, [id]);
			return loadOwnedItem(tx, ownerId, id, 'note');
		});
	});
}

export async function deleteNote(userId: string, itemId: string): Promise<void> {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		await deleteOwnedItem(db, ownerId, id, 'note');
	});
}
