import { db } from '$lib/server/db';
import { parseInput } from '$lib/server/errors';
import {
	insertReminderDetails,
	updateReminderDetails,
	type ReminderPatch
} from '$lib/server/repositories/content.repository';
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
	createReminderSchema,
	idSchema,
	updateReminderSchema,
	type CreateReminderInput,
	type ListItemsInput,
	type UpdateReminderInput
} from '$lib/server/validation';
import { loadOwnedItem, scopedUserId, serviceOperation, validateRelations } from './internal';
import { listItems } from './items.service';

export async function listReminders(userId: string, input: Omit<ListItemsInput, 'types'> = {}) {
	return listItems(userId, { ...input, types: ['reminder'] });
}

export async function createReminder(userId: string, input: CreateReminderInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = parseInput(createReminderSchema, input);
		return db.transaction(async (tx) => {
			await validateRelations(tx, ownerId, parsed.collectionId, parsed.tagIds);
			const item = await insertBaseItem(tx, ownerId, {
				type: 'reminder',
				title: parsed.title,
				description: parsed.description ?? null,
				collectionId: parsed.collectionId ?? null,
				favorite: parsed.favorite ?? false,
				archived: parsed.archived ?? false,
				sourceDate: parsed.sourceDate ?? null
			});
			await insertReminderDetails(tx, ownerId, {
				itemId: item.id,
				description: parsed.description ?? null,
				dueAt: parsed.dueAt,
				recurrence: parsed.recurrence ?? null,
				timeZone: parsed.timeZone
			});
			if (parsed.tagIds) await replaceItemTags(tx, ownerId, item.id, parsed.tagIds);
			await refreshSearchDocuments(tx, ownerId, [item.id]);
			return loadOwnedItem(tx, ownerId, item.id, 'reminder');
		});
	});
}

export async function getReminder(userId: string, itemId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		return loadOwnedItem(db, ownerId, id, 'reminder');
	});
}

export async function updateReminder(userId: string, itemId: string, input: UpdateReminderInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		const parsed = parseInput(updateReminderSchema, input);
		return db.transaction(async (tx) => {
			await requireOwnedItem(tx, ownerId, id, 'reminder');
			await validateRelations(tx, ownerId, parsed.collectionId, parsed.tagIds);

			const itemPatch: BaseItemPatch = {};
			if (parsed.title !== undefined) itemPatch.title = parsed.title;
			if (parsed.description !== undefined) itemPatch.description = parsed.description;
			if (parsed.collectionId !== undefined) itemPatch.collectionId = parsed.collectionId;
			if (parsed.favorite !== undefined) itemPatch.favorite = parsed.favorite;
			if (parsed.archived !== undefined) itemPatch.archived = parsed.archived;
			if (parsed.state !== undefined) itemPatch.state = parsed.state;
			if (parsed.sourceDate !== undefined) itemPatch.sourceDate = parsed.sourceDate;

			const reminderPatch: ReminderPatch = {};
			if (parsed.description !== undefined) reminderPatch.description = parsed.description;
			if (parsed.dueAt !== undefined) reminderPatch.dueAt = parsed.dueAt;
			if (parsed.recurrence !== undefined) reminderPatch.recurrence = parsed.recurrence;
			if (parsed.timeZone !== undefined) reminderPatch.timeZone = parsed.timeZone;
			if (parsed.reminderState !== undefined) {
				reminderPatch.state = parsed.reminderState;
				reminderPatch.completedAt = parsed.reminderState === 'completed' ? new Date() : null;
			}

			await updateBaseItem(tx, ownerId, id, itemPatch);
			if (Object.keys(reminderPatch).length > 0) {
				await updateReminderDetails(tx, ownerId, id, reminderPatch);
			}
			if (parsed.tagIds !== undefined) await replaceItemTags(tx, ownerId, id, parsed.tagIds);
			await refreshSearchDocuments(tx, ownerId, [id]);
			return loadOwnedItem(tx, ownerId, id, 'reminder');
		});
	});
}

export async function completeReminder(userId: string, itemId: string, completed = true) {
	return updateReminder(userId, itemId, {
		reminderState: completed ? 'completed' : 'pending'
	});
}

export async function deleteReminder(userId: string, itemId: string): Promise<void> {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		await deleteOwnedItem(db, ownerId, id, 'reminder');
	});
}
