import { and, asc, desc, eq, gt, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	collections,
	items,
	links,
	linkTargets,
	notes,
	reminders,
	shares
} from '$lib/server/db/schema';
import {
	ServiceError,
	notFound,
	parseInput,
	requireUserId,
	toServiceError
} from '$lib/server/errors';
import { runtimeConfig } from '$lib/server/config';
import { createShareToken, hashShareToken, isShareToken } from './token';
import { createShareSchema, type CreateShareInput } from './validation';

const MAX_PUBLIC_COLLECTION_ITEMS = 500;

const publicItemProjection = {
	type: items.type,
	title: items.title,
	description: items.description,
	createdAt: items.createdAt,
	url: linkTargets.normalizedUrl,
	domain: linkTargets.domain,
	metadataTitle: linkTargets.metadataTitle,
	metadataDescription: linkTargets.metadataDescription,
	siteName: linkTargets.siteName,
	noteBody: notes.body,
	reminderDescription: reminders.description,
	dueAt: reminders.dueAt,
	reminderState: reminders.state,
	recurrence: reminders.recurrence,
	timeZone: reminders.timeZone
} as const;

export type PublicItemSource = Awaited<ReturnType<typeof loadPublicItems>>[number];

export interface PublicSharedItem {
	type: 'link' | 'note' | 'reminder';
	title: string | null;
	description: string | null;
	createdAt: Date;
	link?: {
		url: string;
		domain: string;
		metadataTitle: string | null;
		metadataDescription: string | null;
		siteName: string | null;
	};
	note?: { body: string };
	reminder?: {
		description: string | null;
		dueAt: Date;
		state: 'pending' | 'completed';
		recurrence: string | null;
		timeZone: string;
	};
}

export type PublicShare =
	| {
			kind: 'item';
			expiresAt: Date | null;
			item: PublicSharedItem;
	  }
	| {
			kind: 'collection';
			expiresAt: Date | null;
			collection: {
				name: string;
				description: string | null;
				items: PublicSharedItem[];
				truncated: boolean;
			};
	  };

export function toPublicItem(row: PublicItemSource): PublicSharedItem {
	const common = {
		type: row.type,
		title: row.title,
		description: row.description,
		createdAt: row.createdAt
	};

	switch (row.type) {
		case 'link':
			if (!row.url || !row.domain) throw notFound('Shared item');
			return {
				...common,
				type: 'link',
				link: {
					url: row.url,
					domain: row.domain,
					metadataTitle: row.metadataTitle,
					metadataDescription: row.metadataDescription,
					siteName: row.siteName
				}
			};
		case 'note':
			if (row.noteBody === null) throw notFound('Shared item');
			return { ...common, type: 'note', note: { body: row.noteBody } };
		case 'reminder':
			if (!row.dueAt || !row.reminderState || !row.timeZone) throw notFound('Shared item');
			return {
				...common,
				type: 'reminder',
				reminder: {
					description: row.reminderDescription,
					dueAt: row.dueAt,
					state: row.reminderState,
					recurrence: row.recurrence,
					timeZone: row.timeZone
				}
			};
	}
}

async function loadPublicItems(userId: string, itemId?: string, collectionId?: string) {
	const conditions = [eq(items.userId, userId)];
	if (itemId) conditions.push(eq(items.id, itemId));
	if (collectionId) conditions.push(eq(items.collectionId, collectionId));

	return db
		.select(publicItemProjection)
		.from(items)
		.leftJoin(links, and(eq(links.userId, userId), eq(links.itemId, items.id)))
		.leftJoin(linkTargets, and(eq(linkTargets.userId, userId), eq(linkTargets.id, links.targetId)))
		.leftJoin(notes, and(eq(notes.userId, userId), eq(notes.itemId, items.id)))
		.leftJoin(reminders, and(eq(reminders.userId, userId), eq(reminders.itemId, items.id)))
		.where(and(...conditions))
		.orderBy(asc(items.sortOrder), desc(items.createdAt))
		.limit(collectionId ? MAX_PUBLIC_COLLECTION_ITEMS + 1 : 1);
}

async function sharingOperation<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw toServiceError(error);
	}
}

export async function createShare(userId: string, input: CreateShareInput) {
	return sharingOperation(async () => {
		const ownerId = requireUserId(userId);
		const parsed = parseInput(createShareSchema, input);
		const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;
		if (expiresAt && expiresAt <= new Date()) {
			throw new ServiceError('validation_failed', 'The expiration must be in the future', 400, {
				issues: [{ path: 'expiresAt', message: 'Choose a future date and time' }]
			});
		}

		const rawToken = createShareToken();
		const tokenHash = hashShareToken(rawToken);
		const created = await db.transaction(async (tx) => {
			if (parsed.itemId) {
				const [target] = await tx
					.select({ id: items.id })
					.from(items)
					.where(and(eq(items.userId, ownerId), eq(items.id, parsed.itemId)))
					.limit(1);
				if (!target) throw notFound('Item');
			} else if (parsed.collectionId) {
				const [target] = await tx
					.select({ id: collections.id })
					.from(collections)
					.where(and(eq(collections.userId, ownerId), eq(collections.id, parsed.collectionId)))
					.limit(1);
				if (!target) throw notFound('Collection');
			}

			const [share] = await tx
				.insert(shares)
				.values({
					userId: ownerId,
					itemId: parsed.itemId,
					collectionId: parsed.collectionId,
					tokenHash,
					expiresAt
				})
				.returning({
					id: shares.id,
					itemId: shares.itemId,
					collectionId: shares.collectionId,
					expiresAt: shares.expiresAt,
					createdAt: shares.createdAt
				});
			if (!share) throw new Error('Insert did not return a share');
			return share;
		});

		return {
			share: {
				id: created.id,
				targetType: created.itemId ? ('item' as const) : ('collection' as const),
				targetId: created.itemId ?? created.collectionId,
				expiresAt: created.expiresAt,
				createdAt: created.createdAt
			},
			token: rawToken,
			url: new URL(`/s/${rawToken}`, runtimeConfig.origin).toString()
		};
	});
}

export async function listShares(userId: string) {
	return sharingOperation(async () => {
		const ownerId = requireUserId(userId);
		const rows = await db
			.select({
				id: shares.id,
				itemId: shares.itemId,
				collectionId: shares.collectionId,
				itemTitle: items.title,
				itemType: items.type,
				collectionName: collections.name,
				expiresAt: shares.expiresAt,
				revokedAt: shares.revokedAt,
				lastAccessedAt: shares.lastAccessedAt,
				createdAt: shares.createdAt
			})
			.from(shares)
			.leftJoin(items, and(eq(items.userId, ownerId), eq(items.id, shares.itemId)))
			.leftJoin(
				collections,
				and(eq(collections.userId, ownerId), eq(collections.id, shares.collectionId))
			)
			.where(eq(shares.userId, ownerId))
			.orderBy(desc(shares.createdAt));

		return rows.map((row) => ({
			id: row.id,
			targetType: row.itemId ? ('item' as const) : ('collection' as const),
			targetId: row.itemId ?? row.collectionId,
			targetTitle: row.itemId
				? (row.itemTitle ?? `${row.itemType ?? 'item'}`)
				: (row.collectionName ?? 'Collection'),
			expiresAt: row.expiresAt,
			revokedAt: row.revokedAt,
			lastAccessedAt: row.lastAccessedAt,
			createdAt: row.createdAt
		}));
	});
}

export async function revokeShare(userId: string, shareId: string) {
	return sharingOperation(async () => {
		const ownerId = requireUserId(userId);
		const [revoked] = await db
			.update(shares)
			.set({ revokedAt: new Date() })
			.where(and(eq(shares.userId, ownerId), eq(shares.id, shareId), isNull(shares.revokedAt)))
			.returning({ id: shares.id, revokedAt: shares.revokedAt });
		if (!revoked) throw notFound('Share');
		return revoked;
	});
}

export async function resolvePublicShare(token: string): Promise<PublicShare> {
	if (!isShareToken(token)) throw notFound('Shared page');
	const now = new Date();
	const tokenHash = hashShareToken(token);

	return sharingOperation(async () => {
		const [share] = await db
			.select({
				id: shares.id,
				userId: shares.userId,
				itemId: shares.itemId,
				collectionId: shares.collectionId,
				expiresAt: shares.expiresAt
			})
			.from(shares)
			.where(
				and(
					eq(shares.tokenHash, tokenHash),
					isNull(shares.revokedAt),
					or(isNull(shares.expiresAt), gt(shares.expiresAt, now))
				)
			)
			.limit(1);

		if (!share) throw notFound('Shared page');

		let result: PublicShare;
		if (share.itemId) {
			const [row] = await loadPublicItems(share.userId, share.itemId);
			if (!row) throw notFound('Shared item');
			result = {
				kind: 'item',
				expiresAt: share.expiresAt,
				item: toPublicItem(row)
			};
		} else if (share.collectionId) {
			const [collection] = await db
				.select({
					name: collections.name,
					description: collections.description
				})
				.from(collections)
				.where(and(eq(collections.userId, share.userId), eq(collections.id, share.collectionId)))
				.limit(1);
			if (!collection) throw notFound('Shared collection');
			const rows = await loadPublicItems(share.userId, undefined, share.collectionId);
			const truncated = rows.length > MAX_PUBLIC_COLLECTION_ITEMS;
			if (truncated) rows.pop();
			result = {
				kind: 'collection',
				expiresAt: share.expiresAt,
				collection: {
					...collection,
					items: rows.map(toPublicItem),
					truncated
				}
			};
		} else {
			throw notFound('Shared page');
		}

		await db.update(shares).set({ lastAccessedAt: now }).where(eq(shares.id, share.id));
		return result;
	});
}
