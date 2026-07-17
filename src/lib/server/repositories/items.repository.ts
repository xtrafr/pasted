import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import {
	collections,
	itemTags,
	items,
	links,
	linkTargets,
	mediaAssets,
	notes,
	reminders,
	tags,
	type Item
} from '$lib/server/db/schema';
import { notFound } from '$lib/server/errors';
import type { ParsedListItemsInput } from '$lib/server/validation';
import type { DatabaseExecutor } from './types';

export interface ListCursor {
	itemId: string;
	value: string;
}

export interface NewBaseItem {
	type: Item['type'];
	title?: string | null;
	description?: string | null;
	collectionId?: string | null;
	state?: Item['state'];
	favorite?: boolean;
	archived?: boolean;
	sourceDate?: Date | null;
}

export type BaseItemPatch = Partial<
	Pick<
		Item,
		'title' | 'description' | 'collectionId' | 'state' | 'favorite' | 'archived' | 'sourceDate'
	>
>;

const itemProjection = {
	id: items.id,
	type: items.type,
	title: items.title,
	description: items.description,
	collectionId: items.collectionId,
	state: items.state,
	favorite: items.favorite,
	archived: items.archived,
	sortOrder: items.sortOrder,
	sourceDate: items.sourceDate,
	createdAt: items.createdAt,
	updatedAt: items.updatedAt,
	targetId: links.targetId,
	originalUrl: links.originalUrl,
	personalNotes: links.personalNotes,
	importedTitle: links.importedTitle,
	sourceType: links.sourceType,
	sourceImportId: links.sourceImportId,
	normalizedUrl: linkTargets.normalizedUrl,
	domain: linkTargets.domain,
	metadataTitle: linkTargets.metadataTitle,
	metadataDescription: linkTargets.metadataDescription,
	siteName: linkTargets.siteName,
	faviconAssetId: linkTargets.faviconAssetId,
	previewAssetId: linkTargets.previewAssetId,
	metadataState: linkTargets.metadataState,
	metadataErrorCode: linkTargets.metadataErrorCode,
	httpStatus: linkTargets.httpStatus,
	lastFetchedAt: linkTargets.lastFetchedAt,
	noteBody: notes.body,
	reminderDescription: reminders.description,
	dueAt: reminders.dueAt,
	reminderState: reminders.state,
	recurrence: reminders.recurrence,
	timeZone: reminders.timeZone,
	completedAt: reminders.completedAt,
	lastNotifiedAt: reminders.lastNotifiedAt,
	collectionName: collections.name,
	collectionColor: collections.color,
	collectionIcon: collections.icon
} as const;

export async function insertBaseItem(
	executor: DatabaseExecutor,
	userId: string,
	input: NewBaseItem
): Promise<Item> {
	const [created] = await executor
		.insert(items)
		.values({
			userId,
			type: input.type,
			title: input.title,
			description: input.description,
			collectionId: input.collectionId,
			state: input.state,
			favorite: input.favorite,
			archived: input.archived,
			sourceDate: input.sourceDate
		})
		.returning();
	if (!created) throw new Error('Insert did not return an item');
	return created;
}

export async function updateBaseItem(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	patch: BaseItemPatch
): Promise<Item> {
	const [updated] = await executor
		.update(items)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(eq(items.userId, userId), eq(items.id, itemId)))
		.returning();
	if (!updated) throw notFound('Item');
	return updated;
}

export async function findOwnedItem(executor: DatabaseExecutor, userId: string, itemId: string) {
	const [row] = await executor
		.select(itemProjection)
		.from(items)
		.leftJoin(links, and(eq(links.userId, userId), eq(links.itemId, items.id)))
		.leftJoin(linkTargets, and(eq(linkTargets.userId, userId), eq(linkTargets.id, links.targetId)))
		.leftJoin(notes, and(eq(notes.userId, userId), eq(notes.itemId, items.id)))
		.leftJoin(reminders, and(eq(reminders.userId, userId), eq(reminders.itemId, items.id)))
		.leftJoin(
			collections,
			and(eq(collections.userId, userId), eq(collections.id, items.collectionId))
		)
		.where(and(eq(items.userId, userId), eq(items.id, itemId)))
		.limit(1);
	return row;
}

export async function requireOwnedItem(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	expectedType?: Item['type']
) {
	const row = await findOwnedItem(executor, userId, itemId);
	if (!row || (expectedType !== undefined && row.type !== expectedType)) {
		throw notFound(
			expectedType === undefined ? 'Item' : expectedType[0]!.toUpperCase() + expectedType.slice(1)
		);
	}
	return row;
}

export async function requireOwnedItemIds(
	executor: DatabaseExecutor,
	userId: string,
	itemIds: readonly string[]
): Promise<void> {
	const rows = await executor
		.select({ id: items.id })
		.from(items)
		.where(and(eq(items.userId, userId), inArray(items.id, [...itemIds])));
	if (rows.length !== itemIds.length) throw notFound('One or more items');
}

export async function deleteOwnedItem(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	expectedType?: Item['type']
): Promise<void> {
	if (expectedType !== undefined) await requireOwnedItem(executor, userId, itemId, expectedType);
	const targetRows = await executor
		.select({ id: links.targetId })
		.from(links)
		.where(and(eq(links.userId, userId), eq(links.itemId, itemId)))
		.for('update');
	const deleted = await executor
		.delete(items)
		.where(and(eq(items.userId, userId), eq(items.id, itemId)))
		.returning({ id: items.id });
	if (deleted.length === 0) throw notFound('Item');
	await cleanupOrphanedLinkTargets(
		executor,
		userId,
		targetRows.map((row) => row.id)
	);
}

export async function cleanupOrphanedLinkTargets(
	executor: DatabaseExecutor,
	userId: string,
	targetIds: readonly string[]
): Promise<void> {
	const uniqueTargetIds = [...new Set(targetIds)];
	if (uniqueTargetIds.length === 0) return;

	const deletedTargets = await executor
		.delete(linkTargets)
		.where(
			and(
				eq(linkTargets.userId, userId),
				inArray(linkTargets.id, uniqueTargetIds),
				sql`not exists (
					select 1
					from ${links} as remaining_link
					where remaining_link.user_id = ${userId}
						and remaining_link.target_id = ${linkTargets.id}
				)`
			)
		)
		.returning({
			faviconAssetId: linkTargets.faviconAssetId,
			previewAssetId: linkTargets.previewAssetId
		});

	const assetIds = [
		...new Set(
			deletedTargets.flatMap((target) =>
				[target.faviconAssetId, target.previewAssetId].filter(
					(assetId): assetId is string => assetId !== null
				)
			)
		)
	];
	await cleanupUnreferencedMediaAssets(executor, userId, assetIds);
}

export async function cleanupUnreferencedMediaAssets(
	executor: DatabaseExecutor,
	userId: string,
	assetIds: readonly string[]
): Promise<void> {
	const uniqueAssetIds = [...new Set(assetIds)];
	if (uniqueAssetIds.length === 0) return;

	await executor.delete(mediaAssets).where(
		and(
			eq(mediaAssets.userId, userId),
			inArray(mediaAssets.id, uniqueAssetIds),
			sql`not exists (
					select 1
					from ${linkTargets} as remaining_target
					where remaining_target.user_id = ${userId}
						and (
							remaining_target.favicon_asset_id = ${mediaAssets.id}
							or remaining_target.preview_asset_id = ${mediaAssets.id}
						)
				)`
		)
	);
}

export async function getTagsForItems(
	executor: DatabaseExecutor,
	userId: string,
	itemIds: readonly string[]
) {
	if (itemIds.length === 0) return [];
	return executor
		.select({
			itemId: itemTags.itemId,
			id: tags.id,
			name: tags.name,
			color: tags.color
		})
		.from(itemTags)
		.innerJoin(tags, and(eq(tags.userId, userId), eq(tags.id, itemTags.tagId)))
		.where(and(eq(itemTags.userId, userId), inArray(itemTags.itemId, [...itemIds])))
		.orderBy(asc(tags.name), asc(tags.id));
}

export async function replaceItemTags(
	executor: DatabaseExecutor,
	userId: string,
	itemId: string,
	tagIds: readonly string[]
): Promise<void> {
	await executor
		.delete(itemTags)
		.where(and(eq(itemTags.userId, userId), eq(itemTags.itemId, itemId)));
	if (tagIds.length > 0) {
		await executor
			.insert(itemTags)
			.values(tagIds.map((tagId) => ({ userId, itemId, tagId })))
			.onConflictDoNothing();
	}
}

export async function addItemTags(
	executor: DatabaseExecutor,
	userId: string,
	itemIds: readonly string[],
	tagIds: readonly string[]
): Promise<void> {
	if (itemIds.length === 0 || tagIds.length === 0) return;
	await executor
		.insert(itemTags)
		.values(itemIds.flatMap((itemId) => tagIds.map((tagId) => ({ userId, itemId, tagId }))))
		.onConflictDoNothing();
}

export async function removeItemTags(
	executor: DatabaseExecutor,
	userId: string,
	itemIds: readonly string[],
	tagIds: readonly string[]
): Promise<void> {
	if (itemIds.length === 0 || tagIds.length === 0) return;
	await executor
		.delete(itemTags)
		.where(
			and(
				eq(itemTags.userId, userId),
				inArray(itemTags.itemId, [...itemIds]),
				inArray(itemTags.tagId, [...tagIds])
			)
		);
}

const searchDocumentExpression = sql<string>`
	setweight(to_tsvector('simple', coalesce(${items.title}, '')), 'A') ||
	setweight(to_tsvector('simple', concat_ws(' ',
		coalesce(${items.description}, ''),
		coalesce((select ${notes.body} from ${notes}
			where ${notes.userId} = ${items.userId} and ${notes.itemId} = ${items.id}), ''),
		coalesce((select ${reminders.description} from ${reminders}
			where ${reminders.userId} = ${items.userId} and ${reminders.itemId} = ${items.id}), ''),
		coalesce((select concat_ws(' ', ${links.originalUrl}, ${links.personalNotes}, ${links.importedTitle})
			from ${links} where ${links.userId} = ${items.userId} and ${links.itemId} = ${items.id}), ''),
		coalesce((select concat_ws(' ', ${linkTargets.normalizedUrl}, ${linkTargets.domain},
			${linkTargets.metadataTitle}, ${linkTargets.metadataDescription}, ${linkTargets.siteName})
			from ${links} inner join ${linkTargets}
				on ${linkTargets.userId} = ${links.userId} and ${linkTargets.id} = ${links.targetId}
			where ${links.userId} = ${items.userId} and ${links.itemId} = ${items.id}), ''),
		coalesce((select ${collections.name} from ${collections}
			where ${collections.userId} = ${items.userId} and ${collections.id} = ${items.collectionId}), ''),
		coalesce((select string_agg(${tags.name}, ' ' order by ${tags.name})
			from ${itemTags} inner join ${tags}
				on ${tags.userId} = ${itemTags.userId} and ${tags.id} = ${itemTags.tagId}
			where ${itemTags.userId} = ${items.userId} and ${itemTags.itemId} = ${items.id}), '')
	)), 'B')
`;

export async function refreshSearchDocuments(
	executor: DatabaseExecutor,
	userId: string,
	itemIds: readonly string[]
): Promise<void> {
	if (itemIds.length === 0) return;
	await executor
		.update(items)
		.set({ searchDocument: searchDocumentExpression, updatedAt: new Date() })
		.where(and(eq(items.userId, userId), inArray(items.id, [...itemIds])));
}

function listSortExpression(
	sortBy: ParsedListItemsInput['sortBy'],
	direction: ParsedListItemsInput['sortDirection']
): SQL<string | Date> {
	switch (sortBy) {
		case 'createdAt':
			return sql<Date>`${items.createdAt}`;
		case 'updatedAt':
			return sql<Date>`${items.updatedAt}`;
		case 'title':
			return sql<string>`lower(coalesce(${items.title}, ''))`;
		case 'domain':
			return sql<string>`lower(coalesce(${linkTargets.domain}, ''))`;
		case 'dueAt':
			return direction === 'asc'
				? sql<Date>`coalesce(${reminders.dueAt}, '9999-12-31 23:59:59+00'::timestamptz)`
				: sql<Date>`coalesce(${reminders.dueAt}, '0001-01-01 00:00:00+00'::timestamptz)`;
	}
}

function cursorValue(sortBy: ParsedListItemsInput['sortBy'], value: string): string | Date {
	if (sortBy === 'title' || sortBy === 'domain') return value;
	return new Date(value);
}

function tagFilter(input: ParsedListItemsInput): SQL | undefined {
	if (!input.tagIds || input.tagIds.length === 0) return undefined;
	const selected = inArray(itemTags.tagId, input.tagIds);
	if (input.tagMode === 'any') {
		return sql`exists (
			select 1 from ${itemTags}
			where ${itemTags.userId} = ${items.userId}
				and ${itemTags.itemId} = ${items.id}
				and ${selected}
		)`;
	}
	return sql`(
		select count(distinct ${itemTags.tagId})::int from ${itemTags}
		where ${itemTags.userId} = ${items.userId}
			and ${itemTags.itemId} = ${items.id}
			and ${selected}
	) = ${input.tagIds.length}`;
}

export async function listOwnedItems(
	executor: DatabaseExecutor,
	userId: string,
	input: ParsedListItemsInput,
	cursor?: ListCursor
) {
	const sortExpression = listSortExpression(input.sortBy, input.sortDirection);
	const conditions: SQL[] = [eq(items.userId, userId), eq(items.archived, input.archived)];

	if (input.query) {
		conditions.push(sql`${items.searchDocument} @@ websearch_to_tsquery('simple', ${input.query})`);
	}
	if (input.types && input.types.length > 0) conditions.push(inArray(items.type, input.types));
	if (input.states && input.states.length > 0) conditions.push(inArray(items.state, input.states));
	if (input.reminderStates && input.reminderStates.length > 0) {
		conditions.push(inArray(reminders.state, input.reminderStates));
	}
	if (input.sourceImportId) conditions.push(eq(links.sourceImportId, input.sourceImportId));
	if (input.collectionId === null) conditions.push(isNull(items.collectionId));
	else if (input.collectionId !== undefined)
		conditions.push(eq(items.collectionId, input.collectionId));
	if (input.domains && input.domains.length > 0) {
		conditions.push(inArray(linkTargets.domain, input.domains));
	}
	if (input.favorite !== undefined) conditions.push(eq(items.favorite, input.favorite));
	if (input.createdFrom) conditions.push(gte(items.createdAt, input.createdFrom));
	if (input.createdTo) conditions.push(lte(items.createdAt, input.createdTo));
	if (input.dueFrom) conditions.push(gte(reminders.dueAt, input.dueFrom));
	if (input.dueTo) conditions.push(lte(reminders.dueAt, input.dueTo));

	const tagsCondition = tagFilter(input);
	if (tagsCondition) conditions.push(tagsCondition);

	if (cursor) {
		const value = cursorValue(input.sortBy, cursor.value);
		const valueComparison =
			input.sortDirection === 'asc'
				? sql`${sortExpression} > ${value}`
				: sql`${sortExpression} < ${value}`;
		const idComparison =
			input.sortDirection === 'asc'
				? sql`${items.id} > ${cursor.itemId}`
				: sql`${items.id} < ${cursor.itemId}`;
		conditions.push(
			or(valueComparison, and(sql`${sortExpression} = ${value}`, idComparison)) ?? valueComparison
		);
	}

	const primaryOrder = input.sortDirection === 'asc' ? asc(sortExpression) : desc(sortExpression);
	const idOrder = input.sortDirection === 'asc' ? asc(items.id) : desc(items.id);

	return executor
		.select({ ...itemProjection, sortValue: sortExpression })
		.from(items)
		.leftJoin(links, and(eq(links.userId, userId), eq(links.itemId, items.id)))
		.leftJoin(linkTargets, and(eq(linkTargets.userId, userId), eq(linkTargets.id, links.targetId)))
		.leftJoin(notes, and(eq(notes.userId, userId), eq(notes.itemId, items.id)))
		.leftJoin(reminders, and(eq(reminders.userId, userId), eq(reminders.itemId, items.id)))
		.leftJoin(
			collections,
			and(eq(collections.userId, userId), eq(collections.id, items.collectionId))
		)
		.where(and(...conditions))
		.orderBy(primaryOrder, idOrder)
		.limit(input.limit + 1);
}

export async function updateOwnedItems(
	executor: DatabaseExecutor,
	userId: string,
	itemIds: readonly string[],
	patch: BaseItemPatch
): Promise<number> {
	const updated = await executor
		.update(items)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(eq(items.userId, userId), inArray(items.id, [...itemIds])))
		.returning({ id: items.id });
	return updated.length;
}

export async function deleteOwnedItems(
	executor: DatabaseExecutor,
	userId: string,
	itemIds: readonly string[]
): Promise<number> {
	const targetRows = await executor
		.select({ id: links.targetId })
		.from(links)
		.where(and(eq(links.userId, userId), inArray(links.itemId, [...itemIds])))
		.for('update');
	const deleted = await executor
		.delete(items)
		.where(and(eq(items.userId, userId), inArray(items.id, [...itemIds])))
		.returning({ id: items.id });
	await cleanupOrphanedLinkTargets(
		executor,
		userId,
		targetRows.map((row) => row.id)
	);
	return deleted.length;
}
