import { and, eq } from 'drizzle-orm';
import { links, linkTargets, notes, reminders } from '$lib/server/db/schema';
import { notFound } from '$lib/server/errors';
import type { DatabaseExecutor } from './types';

export interface NewLinkDetails {
	itemId: string;
	targetId: string;
	originalUrl: string;
	personalNotes?: string | null;
	importedTitle?: string | null;
	sourceType?: string | null;
	sourceImportId?: string | null;
}

export interface LinkPatch {
	targetId?: string;
	originalUrl?: string;
	personalNotes?: string | null;
	importedTitle?: string | null;
	sourceType?: string | null;
	sourceImportId?: string | null;
}

export async function findOrCreateLinkTarget(
	executor: DatabaseExecutor,
	userId: string,
	normalizedUrl: string,
	domain: string
) {
	const inserted = await executor
		.insert(linkTargets)
		.values({ userId, normalizedUrl, domain })
		.onConflictDoNothing({ target: [linkTargets.userId, linkTargets.normalizedUrl] })
		.returning();
	if (inserted[0]) return inserted[0];

	const [existing] = await executor
		.select()
		.from(linkTargets)
		.where(and(eq(linkTargets.userId, userId), eq(linkTargets.normalizedUrl, normalizedUrl)))
		.limit(1);
	if (!existing) throw new Error('Link target disappeared after conflict');
	return existing;
}

export async function findExistingLinkItem(
	executor: DatabaseExecutor,
	userId: string,
	targetId: string,
	excludeItemId?: string
): Promise<string | undefined> {
	const conditions = [eq(links.userId, userId), eq(links.targetId, targetId)];
	const rows = await executor
		.select({ itemId: links.itemId })
		.from(links)
		.where(and(...conditions))
		.limit(2);
	return rows.find((row) => row.itemId !== excludeItemId)?.itemId;
}

export async function insertLinkDetails(
	executor: DatabaseExecutor,
	userId: string,
	input: NewLinkDetails
): Promise<void> {
	await executor.insert(links).values({ userId, ...input });
}

export async function updateLinkDetails(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	patch: LinkPatch
): Promise<void> {
	const updated = await executor
		.update(links)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(eq(links.userId, userId), eq(links.itemId, itemId)))
		.returning({ itemId: links.itemId });
	if (updated.length === 0) throw notFound('Link');
}

export async function insertNoteDetails(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	body: string
): Promise<void> {
	await executor.insert(notes).values({ userId, itemId, body });
}

export async function updateNoteDetails(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	body: string
): Promise<void> {
	const updated = await executor
		.update(notes)
		.set({ body, updatedAt: new Date() })
		.where(and(eq(notes.userId, userId), eq(notes.itemId, itemId)))
		.returning({ itemId: notes.itemId });
	if (updated.length === 0) throw notFound('Note');
}

export interface NewReminderDetails {
	itemId: string;
	description?: string | null;
	dueAt: Date;
	recurrence?: string | null;
	timeZone: string;
}

export interface ReminderPatch {
	description?: string | null;
	dueAt?: Date;
	state?: 'pending' | 'completed';
	recurrence?: string | null;
	timeZone?: string;
	completedAt?: Date | null;
}

export async function insertReminderDetails(
	executor: DatabaseExecutor,
	userId: string,
	input: NewReminderDetails
): Promise<void> {
	await executor.insert(reminders).values({ userId, ...input });
}

export async function updateReminderDetails(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	patch: ReminderPatch
): Promise<void> {
	const updated = await executor
		.update(reminders)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(eq(reminders.userId, userId), eq(reminders.itemId, itemId)))
		.returning({ itemId: reminders.itemId });
	if (updated.length === 0) throw notFound('Reminder');
}
