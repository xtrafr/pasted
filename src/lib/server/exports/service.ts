import { z } from 'zod';
import {
	createExportArtifact,
	type ExportBuildOptions,
	type ExportCollection,
	type ExportFilterInput,
	type ExportFormat,
	type ExportItem,
	type ExportPrivacyInput,
	type ExportSelectionInput,
	type ExportSourceData,
	type ExportTag
} from '$lib/export';
import { ServiceError, parseInput } from '$lib/server/errors';
import { listCollections, listItems, listTags } from '$lib/server/services';

type ListedItem = Awaited<ReturnType<typeof listItems>>['items'][number];

const exportRequestSchema = z
	.object({
		format: z.enum([
			'pasted-json',
			'simple-json',
			'csv',
			'txt',
			'markdown',
			'netscape-bookmarks',
			'zip'
		]),
		scope: z.enum(['all', 'collection', 'domain', 'favorites', 'reminders', 'date', 'manual']),
		collectionId: z.string().uuid().nullable().optional(),
		domain: z.string().trim().max(253).toLowerCase().optional(),
		createdFrom: z.string().datetime({ offset: true }).optional(),
		createdTo: z.string().datetime({ offset: true }).optional(),
		itemIds: z.array(z.string().uuid()).max(10_000).optional(),
		privacy: z
			.object({
				includePersonalNotes: z.boolean().optional(),
				includeSourceDates: z.boolean().optional(),
				includeLinkMetadata: z.boolean().optional(),
				includeNoteBodies: z.boolean().optional(),
				includeReminderDescriptions: z.boolean().optional()
			})
			.strict()
			.optional(),
		includeTitlesInTxt: z.boolean().optional()
	})
	.strict();

export type ExportRequest = z.input<typeof exportRequestSchema>;

function iso(value: Date | null): string | null {
	return value?.toISOString() ?? null;
}

function baseItem(item: ListedItem) {
	return {
		id: item.id,
		title: item.title,
		description: item.description,
		collectionId: item.collectionId,
		tagIds: item.tags.map((tag) => tag.id),
		state: item.state,
		favorite: item.favorite,
		archived: item.archived,
		sortOrder: item.sortOrder,
		sourceDate: iso(item.sourceDate),
		createdAt: item.createdAt.toISOString(),
		updatedAt: item.updatedAt.toISOString()
	};
}

function exportItem(item: ListedItem): ExportItem {
	const base = baseItem(item);
	if (item.type === 'link') {
		if (!item.originalUrl || !item.normalizedUrl || !item.domain) {
			throw new ServiceError('database_error', 'A saved link is missing its URL data', 500);
		}
		return {
			...base,
			type: 'link',
			link: {
				originalUrl: item.originalUrl,
				normalizedUrl: item.normalizedUrl,
				domain: item.domain,
				personalNotes: item.personalNotes,
				importedTitle: item.importedTitle,
				sourceType: item.sourceType,
				metadata: item.metadataState
					? {
							title: item.metadataTitle,
							description: item.metadataDescription,
							siteName: item.siteName,
							state: item.metadataState,
							errorCode: item.metadataErrorCode,
							httpStatus: item.httpStatus,
							lastFetchedAt: iso(item.lastFetchedAt)
						}
					: null
			}
		};
	}
	if (item.type === 'note') {
		return { ...base, type: 'note', note: { body: item.noteBody ?? '' } };
	}
	if (!item.dueAt || !item.reminderState) {
		throw new ServiceError('database_error', 'A reminder is missing its schedule', 500);
	}
	return {
		...base,
		type: 'reminder',
		reminder: {
			description: item.reminderDescription,
			dueAt: item.dueAt.toISOString(),
			state: item.reminderState,
			recurrence: item.recurrence,
			timeZone: item.timeZone ?? 'UTC',
			completedAt: iso(item.completedAt),
			lastNotifiedAt: iso(item.lastNotifiedAt)
		}
	};
}

async function allItems(userId: string): Promise<ListedItem[]> {
	const rows: ListedItem[] = [];
	for (const archived of [false, true]) {
		let cursor: string | undefined;
		for (let page = 0; page < 1_000; page += 1) {
			const result = await listItems(userId, {
				archived,
				limit: 100,
				...(cursor ? { cursor } : {})
			});
			rows.push(...result.items);
			cursor = result.nextCursor;
			if (!cursor) break;
			if (rows.length > 100_000) {
				throw new ServiceError(
					'validation_failed',
					'Account exports are limited to 100,000 items',
					400
				);
			}
		}
	}
	return rows;
}

export async function loadExportSource(userId: string): Promise<ExportSourceData> {
	const [items, collections, tags] = await Promise.all([
		allItems(userId),
		listCollections(userId),
		listTags(userId)
	]);
	return {
		collections: collections.map((collection): ExportCollection => ({
			id: collection.id,
			name: collection.name,
			description: collection.description,
			color: collection.color,
			icon: collection.icon,
			sortOrder: collection.sortOrder,
			sortMode: collection.sortMode,
			createdAt: collection.createdAt.toISOString(),
			updatedAt: collection.updatedAt.toISOString()
		})),
		tags: tags.map((tag): ExportTag => ({
			id: tag.id,
			name: tag.name,
			color: tag.color,
			createdAt: tag.createdAt.toISOString(),
			updatedAt: tag.updatedAt.toISOString()
		})),
		items: items.map(exportItem)
	};
}

function requestOptions(request: z.output<typeof exportRequestSchema>): ExportBuildOptions {
	let selection: ExportSelectionInput = { kind: 'all' };
	const filters: ExportFilterInput = {};
	if (request.scope === 'manual') selection = { kind: 'manual', itemIds: request.itemIds ?? [] };
	if (request.scope === 'collection') filters.collectionIds = [request.collectionId ?? null];
	if (request.scope === 'domain' && request.domain) filters.domains = [request.domain];
	if (request.scope === 'favorites') filters.favorite = true;
	if (request.scope === 'reminders') filters.types = ['reminder'];
	if (request.scope === 'date') {
		if (request.createdFrom) filters.createdFrom = request.createdFrom;
		if (request.createdTo) filters.createdTo = request.createdTo;
	}
	return {
		selection,
		filters,
		...(request.privacy ? { privacy: request.privacy as ExportPrivacyInput } : {}),
		...(request.includeTitlesInTxt === undefined
			? {}
			: { includeTitlesInTxt: request.includeTitlesInTxt }),
		generatorVersion: '0.0.1'
	};
}

export async function buildAccountExport(userId: string, input: ExportRequest) {
	const request = parseInput(exportRequestSchema, input);
	if (request.scope === 'collection' && request.collectionId === undefined) {
		throw new ServiceError('validation_failed', 'Choose a collection to export', 400);
	}
	if (request.scope === 'domain' && !request.domain) {
		throw new ServiceError('validation_failed', 'Choose a domain to export', 400);
	}
	if (request.scope === 'manual' && !request.itemIds?.length) {
		throw new ServiceError('validation_failed', 'Choose at least one item to export', 400);
	}
	const source = await loadExportSource(userId);
	return createExportArtifact(request.format as ExportFormat, source, requestOptions(request));
}

export async function exportOverview(userId: string) {
	const source = await loadExportSource(userId);
	const domainCounts = new Map<string, number>();
	for (const item of source.items) {
		if (item.type === 'link') {
			domainCounts.set(item.link.domain, (domainCounts.get(item.link.domain) ?? 0) + 1);
		}
	}
	return {
		total: source.items.length,
		favoriteCount: source.items.filter((item) => item.favorite).length,
		reminderCount: source.items.filter((item) => item.type === 'reminder').length,
		collections: source.collections.map((collection) => ({
			id: collection.id,
			name: collection.name,
			count: source.items.filter((item) => item.collectionId === collection.id).length
		})),
		domains: [...domainCounts]
			.map(([name, count]) => ({ name, count }))
			.toSorted((a, b) => b.count - a.count)
	};
}
