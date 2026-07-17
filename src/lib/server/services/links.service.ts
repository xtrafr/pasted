import { db } from '$lib/server/db';
import { duplicateLink, parseInput } from '$lib/server/errors';
import { enqueueOwnedMetadataBestEffort } from '$lib/server/jobs';
import {
	findExistingLinkItem,
	findOrCreateLinkTarget,
	insertLinkDetails,
	updateLinkDetails,
	type LinkPatch
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
	createLinkSchema,
	idSchema,
	updateLinkSchema,
	type CreateLinkInput,
	type ListItemsInput,
	type UpdateLinkInput
} from '$lib/server/validation';
import {
	loadOwnedItem,
	normalizeServiceUrl,
	requireOwnedImportSession,
	scopedUserId,
	serviceOperation,
	validateRelations
} from './internal';
import { listItems } from './items.service';

export async function listLinks(userId: string, input: Omit<ListItemsInput, 'types'> = {}) {
	return listItems(userId, { ...input, types: ['link'] });
}

export async function createLink(userId: string, input: CreateLinkInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const parsed = parseInput(createLinkSchema, input);
		const normalized = normalizeServiceUrl(parsed.originalUrl);

		const created = await db.transaction(async (tx) => {
			await validateRelations(tx, ownerId, parsed.collectionId, parsed.tagIds);
			if (parsed.sourceImportId) {
				await requireOwnedImportSession(tx, ownerId, parsed.sourceImportId);
			}
			const target = await findOrCreateLinkTarget(
				tx,
				ownerId,
				normalized.normalizedUrl,
				normalized.domain
			);
			if (!parsed.allowDuplicate) {
				const existing = await findExistingLinkItem(tx, ownerId, target.id);
				if (existing) throw duplicateLink(existing);
			}

			const item = await insertBaseItem(tx, ownerId, {
				type: 'link',
				title: parsed.title ?? null,
				description: parsed.description ?? null,
				collectionId: parsed.collectionId ?? null,
				favorite: parsed.favorite ?? false,
				archived: parsed.archived ?? false,
				sourceDate: parsed.sourceDate ?? null
			});
			await insertLinkDetails(tx, ownerId, {
				itemId: item.id,
				targetId: target.id,
				originalUrl: normalized.originalUrl,
				personalNotes: parsed.personalNotes ?? null,
				importedTitle: parsed.importedTitle ?? null,
				sourceType: parsed.sourceType ?? null,
				sourceImportId: parsed.sourceImportId ?? null
			});
			if (parsed.tagIds) await replaceItemTags(tx, ownerId, item.id, parsed.tagIds);
			await refreshSearchDocuments(tx, ownerId, [item.id]);
			return loadOwnedItem(tx, ownerId, item.id, 'link');
		});
		if (created.targetId) await enqueueOwnedMetadataBestEffort(ownerId, [created.targetId]);
		return created;
	});
}

export async function getLink(userId: string, itemId: string) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		return loadOwnedItem(db, ownerId, id, 'link');
	});
}

export async function updateLink(userId: string, itemId: string, input: UpdateLinkInput) {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		const parsed = parseInput(updateLinkSchema, input);

		const updated = await db.transaction(async (tx) => {
			await requireOwnedItem(tx, ownerId, id, 'link');
			await validateRelations(tx, ownerId, parsed.collectionId, parsed.tagIds);
			if (parsed.sourceImportId) {
				await requireOwnedImportSession(tx, ownerId, parsed.sourceImportId);
			}

			const itemPatch: BaseItemPatch = {};
			if (parsed.title !== undefined) itemPatch.title = parsed.title;
			if (parsed.description !== undefined) itemPatch.description = parsed.description;
			if (parsed.collectionId !== undefined) itemPatch.collectionId = parsed.collectionId;
			if (parsed.favorite !== undefined) itemPatch.favorite = parsed.favorite;
			if (parsed.archived !== undefined) itemPatch.archived = parsed.archived;
			if (parsed.state !== undefined) itemPatch.state = parsed.state;
			if (parsed.sourceDate !== undefined) itemPatch.sourceDate = parsed.sourceDate;

			const linkPatch: LinkPatch = {};
			if (parsed.originalUrl !== undefined) {
				const normalized = normalizeServiceUrl(parsed.originalUrl);
				const target = await findOrCreateLinkTarget(
					tx,
					ownerId,
					normalized.normalizedUrl,
					normalized.domain
				);
				if (!parsed.allowDuplicate) {
					const existing = await findExistingLinkItem(tx, ownerId, target.id, id);
					if (existing) throw duplicateLink(existing);
				}
				linkPatch.targetId = target.id;
				linkPatch.originalUrl = normalized.originalUrl;
			}
			if (parsed.personalNotes !== undefined) linkPatch.personalNotes = parsed.personalNotes;
			if (parsed.importedTitle !== undefined) linkPatch.importedTitle = parsed.importedTitle;
			if (parsed.sourceType !== undefined) linkPatch.sourceType = parsed.sourceType;
			if (parsed.sourceImportId !== undefined) linkPatch.sourceImportId = parsed.sourceImportId;

			await updateBaseItem(tx, ownerId, id, itemPatch);
			if (Object.keys(linkPatch).length > 0) await updateLinkDetails(tx, ownerId, id, linkPatch);
			if (parsed.tagIds !== undefined) await replaceItemTags(tx, ownerId, id, parsed.tagIds);
			await refreshSearchDocuments(tx, ownerId, [id]);
			return loadOwnedItem(tx, ownerId, id, 'link');
		});
		if (parsed.originalUrl !== undefined && updated.targetId) {
			await enqueueOwnedMetadataBestEffort(ownerId, [updated.targetId]);
		}
		return updated;
	});
}

export async function deleteLink(userId: string, itemId: string): Promise<void> {
	return serviceOperation(async () => {
		const ownerId = scopedUserId(userId);
		const id = parseInput(idSchema, itemId);
		await deleteOwnedItem(db, ownerId, id, 'link');
	});
}
