import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { assertPastedBackupJsonSize, validatePastedBackup, type PastedBackupV1 } from '$lib/export';
import { db } from '$lib/server/db';
import {
	collections,
	importSessions,
	items,
	links,
	linkTargets,
	notes,
	reminders,
	tags
} from '$lib/server/db/schema';
import { conflict, parseInput, requireUserId } from '$lib/server/errors';
import {
	findOrCreateLinkTarget,
	insertLinkDetails,
	insertNoteDetails,
	insertReminderDetails
} from '$lib/server/repositories/content.repository';
import {
	insertBaseItem,
	refreshSearchDocuments,
	replaceItemTags
} from '$lib/server/repositories/items.repository';
import { enqueueOwnedMetadataBestEffort } from '$lib/server/jobs';
import { insertCollection, insertTag } from '$lib/server/repositories/taxonomy.repository';
import { normalizeServiceUrl, serviceOperation } from '$lib/server/services/internal';

const restoreRequestSchema = z
	.object({
		idempotencyKey: z
			.string()
			.trim()
			.min(8)
			.max(128)
			.regex(/^[a-z0-9._:-]+$/i),
		backup: z.unknown()
	})
	.strict();

export type RestoreBackupInput = z.input<typeof restoreRequestSchema>;

interface RestoreSummary {
	sessionId: string;
	collectionsCreated: number;
	tagsCreated: number;
	linksCreated: number;
	notesCreated: number;
	remindersCreated: number;
	itemsCreated: number;
	replayed: boolean;
}

function restoreHash(backup: PastedBackupV1): string {
	return createHash('sha256').update(JSON.stringify(backup)).digest('hex');
}

function previousSummary(options: Record<string, unknown>, sessionId: string): RestoreSummary {
	const summary = options.restoreSummary;
	if (!summary || typeof summary !== 'object') {
		return {
			sessionId,
			collectionsCreated: 0,
			tagsCreated: 0,
			linksCreated: 0,
			notesCreated: 0,
			remindersCreated: 0,
			itemsCreated: 0,
			replayed: true
		};
	}
	const record = summary as Record<string, unknown>;
	const count = (key: string) => (typeof record[key] === 'number' ? Number(record[key]) : 0);
	return {
		sessionId,
		collectionsCreated: count('collectionsCreated'),
		tagsCreated: count('tagsCreated'),
		linksCreated: count('linksCreated'),
		notesCreated: count('notesCreated'),
		remindersCreated: count('remindersCreated'),
		itemsCreated: count('itemsCreated'),
		replayed: true
	};
}

export async function restorePastedBackup(userId: string, input: RestoreBackupInput) {
	return serviceOperation(async () => {
		const ownerId = requireUserId(userId);
		const request = parseInput(restoreRequestSchema, input);
		assertPastedBackupJsonSize(request.backup);
		const backup = validatePastedBackup(request.backup);
		const hash = restoreHash(backup);
		const targetIdsToQueue: string[] = [];

		const summary = await db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(importSessions)
				.where(
					and(
						eq(importSessions.userId, ownerId),
						eq(importSessions.idempotencyKey, request.idempotencyKey)
					)
				)
				.limit(1);
			if (existing) {
				if (existing.options.restoreHash !== hash) {
					throw conflict('The restore key was already used for a different backup');
				}
				return previousSummary(existing.options, existing.id);
			}

			const [session] = await tx
				.insert(importSessions)
				.values({
					userId: ownerId,
					format: 'pasted_json',
					state: 'importing',
					sourceLabel: 'pasted',
					fileName: null,
					idempotencyKey: request.idempotencyKey,
					options: { restoreHash: hash },
					totalCount: backup.data.items.length,
					validCount: backup.data.items.length
				})
				.returning();
			if (!session) throw new Error('Restore session was not created');

			const collectionIdMap = new Map<string, string>();
			const existingCollections = await tx
				.select()
				.from(collections)
				.where(eq(collections.userId, ownerId));
			const collectionsByName = new Map(
				existingCollections.map((collection) => [collection.name, collection])
			);
			let collectionsCreated = 0;
			for (const source of backup.data.collections) {
				let target = collectionsByName.get(source.name);
				if (!target) {
					target = await insertCollection(tx, ownerId, {
						name: source.name,
						description: source.description,
						color: source.color,
						icon: source.icon,
						sortOrder: source.sortOrder,
						sortMode: source.sortMode
					});
					await tx
						.update(collections)
						.set({ createdAt: new Date(source.createdAt), updatedAt: new Date(source.updatedAt) })
						.where(and(eq(collections.userId, ownerId), eq(collections.id, target.id)));
					collectionsByName.set(source.name, target);
					collectionsCreated += 1;
				}
				collectionIdMap.set(source.id, target.id);
			}

			const tagIdMap = new Map<string, string>();
			const existingTags = await tx.select().from(tags).where(eq(tags.userId, ownerId));
			const tagsByName = new Map(existingTags.map((tag) => [tag.name, tag]));
			let tagsCreated = 0;
			for (const source of backup.data.tags) {
				let target = tagsByName.get(source.name);
				if (!target) {
					target = await insertTag(tx, ownerId, { name: source.name, color: source.color });
					await tx
						.update(tags)
						.set({ createdAt: new Date(source.createdAt), updatedAt: new Date(source.updatedAt) })
						.where(and(eq(tags.userId, ownerId), eq(tags.id, target.id)));
					tagsByName.set(source.name, target);
					tagsCreated += 1;
				}
				tagIdMap.set(source.id, target.id);
			}

			const itemDatePatches: Array<{
				id: string;
				createdAt: Date;
				updatedAt: Date;
				sortOrder: number;
			}> = [];
			let linksCreated = 0;
			let notesCreated = 0;
			let remindersCreated = 0;
			for (const source of backup.data.items) {
				const collectionId = source.collectionId
					? (collectionIdMap.get(source.collectionId) ?? null)
					: null;
				const tagIds = source.tagIds.flatMap((id) => {
					const mapped = tagIdMap.get(id);
					return mapped ? [mapped] : [];
				});
				const item = await insertBaseItem(tx, ownerId, {
					type: source.type,
					title: source.title,
					description: source.description,
					collectionId,
					state: source.state,
					favorite: source.favorite,
					archived: source.archived,
					sourceDate: source.sourceDate ? new Date(source.sourceDate) : null
				});

				if (source.type === 'link') {
					const normalized = normalizeServiceUrl(source.link.originalUrl);
					const target = await findOrCreateLinkTarget(
						tx,
						ownerId,
						normalized.normalizedUrl,
						normalized.domain
					);
					await insertLinkDetails(tx, ownerId, {
						itemId: item.id,
						targetId: target.id,
						originalUrl: normalized.originalUrl,
						personalNotes: source.link.personalNotes,
						importedTitle: source.link.importedTitle,
						sourceType: source.link.sourceType,
						sourceImportId: session.id
					});
					targetIdsToQueue.push(target.id);
					await tx
						.update(links)
						.set({ createdAt: new Date(source.createdAt), updatedAt: new Date(source.updatedAt) })
						.where(and(eq(links.userId, ownerId), eq(links.itemId, item.id)));
					if (source.link.metadata) {
						await tx
							.update(linkTargets)
							.set({
								metadataTitle: source.link.metadata.title,
								metadataDescription: source.link.metadata.description,
								siteName: source.link.metadata.siteName,
								metadataState: 'pending',
								metadataErrorCode: null,
								httpStatus: source.link.metadata.httpStatus,
								lastFetchedAt: null,
								nextRetryAt: null
							})
							.where(and(eq(linkTargets.userId, ownerId), eq(linkTargets.id, target.id)));
					}
					linksCreated += 1;
				} else if (source.type === 'note') {
					await insertNoteDetails(tx, ownerId, item.id, source.note.body);
					await tx
						.update(notes)
						.set({ createdAt: new Date(source.createdAt), updatedAt: new Date(source.updatedAt) })
						.where(and(eq(notes.userId, ownerId), eq(notes.itemId, item.id)));
					notesCreated += 1;
				} else {
					await insertReminderDetails(tx, ownerId, {
						itemId: item.id,
						description: source.reminder.description,
						dueAt: new Date(source.reminder.dueAt),
						recurrence: source.reminder.recurrence,
						timeZone: source.reminder.timeZone
					});
					await tx
						.update(reminders)
						.set({
							state: source.reminder.state,
							completedAt: source.reminder.completedAt
								? new Date(source.reminder.completedAt)
								: null,
							lastNotifiedAt: source.reminder.lastNotifiedAt
								? new Date(source.reminder.lastNotifiedAt)
								: null,
							createdAt: new Date(source.createdAt),
							updatedAt: new Date(source.updatedAt)
						})
						.where(and(eq(reminders.userId, ownerId), eq(reminders.itemId, item.id)));
					remindersCreated += 1;
				}
				await replaceItemTags(tx, ownerId, item.id, tagIds);
				itemDatePatches.push({
					id: item.id,
					createdAt: new Date(source.createdAt),
					updatedAt: new Date(source.updatedAt),
					sortOrder: source.sortOrder
				});
			}

			await refreshSearchDocuments(
				tx,
				ownerId,
				itemDatePatches.map((item) => item.id)
			);
			for (const patch of itemDatePatches) {
				await tx
					.update(items)
					.set({
						createdAt: patch.createdAt,
						updatedAt: patch.updatedAt,
						sortOrder: patch.sortOrder
					})
					.where(and(eq(items.userId, ownerId), eq(items.id, patch.id)));
			}

			const summary: Omit<RestoreSummary, 'sessionId' | 'replayed'> = {
				collectionsCreated,
				tagsCreated,
				linksCreated,
				notesCreated,
				remindersCreated,
				itemsCreated: backup.data.items.length
			};
			await tx
				.update(importSessions)
				.set({
					state: 'completed',
					options: { restoreHash: hash, restoreSummary: summary },
					importedCount: backup.data.items.length,
					completedAt: new Date(),
					updatedAt: new Date()
				})
				.where(and(eq(importSessions.userId, ownerId), eq(importSessions.id, session.id)));

			return { sessionId: session.id, ...summary, replayed: false } satisfies RestoreSummary;
		});
		await enqueueOwnedMetadataBestEffort(ownerId, targetIdsToQueue);
		return summary;
	});
}
