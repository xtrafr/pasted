import type {
	ExportFilterInput,
	ExportItem,
	ExportItemType,
	ExportReminderState,
	ExportSelectionInput,
	ExportSourceData,
	ResolvedExportFilters,
	ResolvedExportSelection
} from './types';

const ITEM_TYPES = new Set<ExportItemType>(['link', 'note', 'reminder']);
const REMINDER_STATES = new Set<ExportReminderState>(['pending', 'completed']);

function uniqueStrings(values: readonly string[] | undefined): string[] {
	return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function uniqueNullableStrings(values: readonly (string | null)[] | undefined): (string | null)[] {
	const result: (string | null)[] = [];
	const seen = new Set<string>();
	for (const value of values ?? []) {
		const normalized = value === null ? null : value.trim();
		if (normalized === '') continue;
		const key = normalized === null ? '__null__' : normalized;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(normalized);
		}
	}
	return result;
}

function optionalDate(value: string | undefined, name: string): string | null {
	if (value === undefined || value.trim() === '') return null;
	if (Number.isNaN(Date.parse(value))) throw new TypeError(`${name} must be a valid date`);
	return value;
}

export function resolveExportSelection(
	selection: ExportSelectionInput = { kind: 'all' }
): ResolvedExportSelection {
	if (selection.kind === 'all') return { kind: 'all', itemIds: [], query: null };
	const itemIds = uniqueStrings(selection.itemIds);
	return {
		kind: selection.kind,
		itemIds,
		query: selection.kind === 'search' ? selection.query?.trim() || null : null
	};
}

export function resolveExportFilters(filters: ExportFilterInput = {}): ResolvedExportFilters {
	const types = [...new Set(filters.types ?? [])];
	if (types.some((type) => !ITEM_TYPES.has(type))) throw new TypeError('Unknown item type filter');
	const reminderStates = [...new Set(filters.reminderStates ?? [])];
	if (reminderStates.some((state) => !REMINDER_STATES.has(state))) {
		throw new TypeError('Unknown reminder state filter');
	}
	const createdFrom = optionalDate(filters.createdFrom, 'createdFrom');
	const createdTo = optionalDate(filters.createdTo, 'createdTo');
	if (createdFrom && createdTo && Date.parse(createdFrom) > Date.parse(createdTo)) {
		throw new TypeError('createdFrom must not be after createdTo');
	}

	return {
		collectionIds: uniqueNullableStrings(filters.collectionIds),
		tagIds: uniqueStrings(filters.tagIds),
		tagMatch: filters.tagMatch ?? 'any',
		types,
		domains: uniqueStrings(filters.domains).map((domain) => domain.toLowerCase()),
		favorite: filters.favorite ?? null,
		archived: filters.archived ?? null,
		createdFrom,
		createdTo,
		reminderStates
	};
}

export function hasActiveExportFilters(filters: ResolvedExportFilters): boolean {
	return (
		filters.collectionIds.length > 0 ||
		filters.tagIds.length > 0 ||
		filters.types.length > 0 ||
		filters.domains.length > 0 ||
		filters.favorite !== null ||
		filters.archived !== null ||
		filters.createdFrom !== null ||
		filters.createdTo !== null ||
		filters.reminderStates.length > 0
	);
}

function itemMatchesFilters(item: ExportItem, filters: ResolvedExportFilters): boolean {
	if (
		filters.collectionIds.length > 0 &&
		!filters.collectionIds.some((collectionId) => collectionId === item.collectionId)
	) {
		return false;
	}
	if (filters.types.length > 0 && !filters.types.includes(item.type)) return false;
	if (filters.favorite !== null && item.favorite !== filters.favorite) return false;
	if (filters.archived !== null && item.archived !== filters.archived) return false;
	if (filters.createdFrom && Date.parse(item.createdAt) < Date.parse(filters.createdFrom))
		return false;
	if (filters.createdTo && Date.parse(item.createdAt) > Date.parse(filters.createdTo)) return false;
	if (
		filters.domains.length > 0 &&
		(item.type !== 'link' || !filters.domains.includes(item.link.domain.toLowerCase()))
	) {
		return false;
	}
	if (filters.tagIds.length > 0) {
		const matches = filters.tagIds.filter((tagId) => item.tagIds.includes(tagId)).length;
		if (filters.tagMatch === 'all' ? matches !== filters.tagIds.length : matches === 0)
			return false;
	}
	if (
		filters.reminderStates.length > 0 &&
		(item.type !== 'reminder' || !filters.reminderStates.includes(item.reminder.state))
	) {
		return false;
	}
	return true;
}

export function selectExportData(
	source: ExportSourceData,
	selectionInput: ExportSelectionInput = { kind: 'all' },
	filterInput: ExportFilterInput = {}
): {
	data: ExportSourceData;
	selection: ResolvedExportSelection;
	filters: ResolvedExportFilters;
} {
	const selection = resolveExportSelection(selectionInput);
	const filters = resolveExportFilters(filterInput);
	const selectedIds = selection.kind === 'all' ? null : new Set(selection.itemIds);
	const items = source.items.filter(
		(item) =>
			(selectedIds === null || selectedIds.has(item.id)) && itemMatchesFilters(item, filters)
	);

	const retainAllTaxonomy = selection.kind === 'all' && !hasActiveExportFilters(filters);
	const collectionIds = new Set(items.map((item) => item.collectionId).filter((id) => id !== null));
	for (const id of filters.collectionIds) if (id !== null) collectionIds.add(id);
	const tagIds = new Set(items.flatMap((item) => item.tagIds));
	for (const id of filters.tagIds) tagIds.add(id);

	return {
		data: {
			collections: retainAllTaxonomy
				? [...source.collections]
				: source.collections.filter((collection) => collectionIds.has(collection.id)),
			tags: retainAllTaxonomy ? [...source.tags] : source.tags.filter((tag) => tagIds.has(tag.id)),
			items
		},
		selection,
		filters
	};
}
