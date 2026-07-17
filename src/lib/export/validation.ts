import {
	PASTED_BACKUP_FORMAT,
	PASTED_BACKUP_VERSION,
	type BackupValidationIssue,
	type PastedBackupV1
} from './types';

export interface BackupRestoreLimits {
	maxJsonBytes: number;
	maxItems: number;
	maxCollections: number;
	maxTags: number;
	maxZipBytes: number;
	maxUncompressedBytes: number;
}

export const DEFAULT_BACKUP_RESTORE_LIMITS: Readonly<BackupRestoreLimits> = Object.freeze({
	maxJsonBytes: 50 * 1024 * 1024,
	maxItems: 100_000,
	maxCollections: 10_000,
	maxTags: 25_000,
	maxZipBytes: 50 * 1024 * 1024,
	maxUncompressedBytes: 100 * 1024 * 1024
});

export class BackupValidationError extends Error {
	readonly issues: BackupValidationIssue[];

	constructor(issues: BackupValidationIssue[], options?: ErrorOptions) {
		const summary = issues[0]?.message ?? 'Unknown validation error';
		super(
			`Backup validation failed: ${summary}${issues.length > 1 ? `, plus ${issues.length - 1} more` : ''}`,
			options
		);
		this.name = 'BackupValidationError';
		this.issues = issues;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addIssue(issues: BackupValidationIssue[], path: string, message: string): void {
	if (issues.length < 100) issues.push({ path, message });
}

function expectRecord(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): Record<string, unknown> | undefined {
	if (!isRecord(value)) {
		addIssue(issues, path, 'Expected an object');
		return undefined;
	}
	return value;
}

function expectArray(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): unknown[] | undefined {
	if (!Array.isArray(value)) {
		addIssue(issues, path, 'Expected an array');
		return undefined;
	}
	return value;
}

function checkString(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	allowEmpty = true
): value is string {
	if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
		addIssue(issues, path, allowEmpty ? 'Expected a string' : 'Expected a non-empty string');
		return false;
	}
	return true;
}

function checkNullableString(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): value is string | null {
	if (value !== null && typeof value !== 'string') {
		addIssue(issues, path, 'Expected a string or null');
		return false;
	}
	return true;
}

function checkBoolean(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	if (typeof value !== 'boolean') addIssue(issues, path, 'Expected a boolean');
}

function checkInteger(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	minimum?: number
): void {
	if (!Number.isSafeInteger(value) || (minimum !== undefined && Number(value) < minimum)) {
		addIssue(issues, path, 'Expected a safe integer');
	}
}

function checkEnum(
	value: unknown,
	allowed: ReadonlySet<string>,
	path: string,
	issues: BackupValidationIssue[]
): void {
	if (typeof value !== 'string' || !allowed.has(value)) {
		addIssue(issues, path, `Expected one of: ${[...allowed].join(', ')}`);
	}
}

function checkDate(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	nullable = false
): void {
	if (nullable && value === null) return;
	if (
		typeof value !== 'string' ||
		!/\d{4}-\d{2}-\d{2}T/.test(value) ||
		Number.isNaN(Date.parse(value))
	) {
		addIssue(issues, path, nullable ? 'Expected an ISO date or null' : 'Expected an ISO date');
	}
}

function checkStringArray(value: unknown, path: string, issues: BackupValidationIssue[]): string[] {
	const array = expectArray(value, path, issues);
	if (!array) return [];
	const result: string[] = [];
	const seen = new Set<string>();
	array.forEach((entry, index) => {
		if (checkString(entry, `${path}[${index}]`, issues, false)) {
			if (seen.has(entry)) addIssue(issues, `${path}[${index}]`, 'Duplicate value');
			else {
				seen.add(entry);
				result.push(entry);
			}
		}
	});
	return result;
}

function checkNullableStringArray(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): (string | null)[] {
	const array = expectArray(value, path, issues);
	if (!array) return [];
	const result: (string | null)[] = [];
	const seen = new Set<string>();
	array.forEach((entry, index) => {
		if (entry !== null && !checkString(entry, `${path}[${index}]`, issues, false)) return;
		const key = entry === null ? '__null__' : entry;
		if (seen.has(key)) addIssue(issues, `${path}[${index}]`, 'Duplicate value');
		else {
			seen.add(key);
			result.push(entry);
		}
	});
	return result;
}

function checkHttpUrl(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	if (!checkString(value, path, issues, false)) return;
	try {
		const url = new URL(value);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			addIssue(issues, path, 'URL must use HTTP or HTTPS');
		}
	} catch {
		addIssue(issues, path, 'Expected a valid URL');
	}
}

function validateSelection(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	const selection = expectRecord(value, path, issues);
	if (!selection) return;
	checkEnum(selection.kind, new Set(['all', 'manual', 'search']), `${path}.kind`, issues);
	checkStringArray(selection.itemIds, `${path}.itemIds`, issues);
	checkNullableString(selection.query, `${path}.query`, issues);
}

function validateFilters(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	const filters = expectRecord(value, path, issues);
	if (!filters) return;
	checkNullableStringArray(filters.collectionIds, `${path}.collectionIds`, issues);
	checkStringArray(filters.tagIds, `${path}.tagIds`, issues);
	checkEnum(filters.tagMatch, new Set(['any', 'all']), `${path}.tagMatch`, issues);
	const types = checkStringArray(filters.types, `${path}.types`, issues);
	types.forEach((type, index) =>
		checkEnum(type, new Set(['link', 'note', 'reminder']), `${path}.types[${index}]`, issues)
	);
	const domains = checkStringArray(filters.domains, `${path}.domains`, issues);
	domains.forEach((domain, index) => {
		if (domain !== domain.toLowerCase())
			addIssue(issues, `${path}.domains[${index}]`, 'Domain must be lowercase');
	});
	if (filters.favorite !== null) checkBoolean(filters.favorite, `${path}.favorite`, issues);
	if (filters.archived !== null) checkBoolean(filters.archived, `${path}.archived`, issues);
	checkDate(filters.createdFrom, `${path}.createdFrom`, issues, true);
	checkDate(filters.createdTo, `${path}.createdTo`, issues, true);
	const reminderStates = checkStringArray(filters.reminderStates, `${path}.reminderStates`, issues);
	reminderStates.forEach((state, index) =>
		checkEnum(state, new Set(['pending', 'completed']), `${path}.reminderStates[${index}]`, issues)
	);
}

function validatePrivacy(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	const privacy = expectRecord(value, path, issues);
	if (!privacy) return;
	for (const key of [
		'includePersonalNotes',
		'includeSourceDates',
		'includeLinkMetadata',
		'includeNoteBodies',
		'includeReminderDescriptions'
	]) {
		checkBoolean(privacy[key], `${path}.${key}`, issues);
	}
}

function validateCollection(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): string | undefined {
	const collection = expectRecord(value, path, issues);
	if (!collection) return undefined;
	const id = checkString(collection.id, `${path}.id`, issues, false) ? collection.id : undefined;
	checkString(collection.name, `${path}.name`, issues, false);
	checkNullableString(collection.description, `${path}.description`, issues);
	checkNullableString(collection.color, `${path}.color`, issues);
	checkNullableString(collection.icon, `${path}.icon`, issues);
	checkInteger(collection.sortOrder, `${path}.sortOrder`, issues);
	checkEnum(
		collection.sortMode,
		new Set(['manual', 'created_at', 'title']),
		`${path}.sortMode`,
		issues
	);
	checkDate(collection.createdAt, `${path}.createdAt`, issues);
	checkDate(collection.updatedAt, `${path}.updatedAt`, issues);
	return id;
}

function validateTag(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): string | undefined {
	const tag = expectRecord(value, path, issues);
	if (!tag) return undefined;
	const id = checkString(tag.id, `${path}.id`, issues, false) ? tag.id : undefined;
	checkString(tag.name, `${path}.name`, issues, false);
	checkNullableString(tag.color, `${path}.color`, issues);
	checkDate(tag.createdAt, `${path}.createdAt`, issues);
	checkDate(tag.updatedAt, `${path}.updatedAt`, issues);
	return id;
}

function validateMetadata(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	if (value === null) return;
	const metadata = expectRecord(value, path, issues);
	if (!metadata) return;
	checkNullableString(metadata.title, `${path}.title`, issues);
	checkNullableString(metadata.description, `${path}.description`, issues);
	checkNullableString(metadata.siteName, `${path}.siteName`, issues);
	checkEnum(
		metadata.state,
		new Set(['pending', 'fetching', 'ready', 'failed', 'blocked']),
		`${path}.state`,
		issues
	);
	checkNullableString(metadata.errorCode, `${path}.errorCode`, issues);
	if (metadata.httpStatus !== null)
		checkInteger(metadata.httpStatus, `${path}.httpStatus`, issues, 100);
	checkDate(metadata.lastFetchedAt, `${path}.lastFetchedAt`, issues, true);
}

interface ValidatedItemReference {
	id?: string;
	collectionId: string | null | undefined;
	tagIds: string[];
}

function validateItem(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): ValidatedItemReference {
	const item = expectRecord(value, path, issues);
	if (!item) return { collectionId: undefined, tagIds: [] };
	const id = checkString(item.id, `${path}.id`, issues, false) ? item.id : undefined;
	checkNullableString(item.title, `${path}.title`, issues);
	checkNullableString(item.description, `${path}.description`, issues);
	const collectionId = checkNullableString(item.collectionId, `${path}.collectionId`, issues)
		? item.collectionId
		: undefined;
	const tagIds = checkStringArray(item.tagIds, `${path}.tagIds`, issues);
	checkEnum(item.state, new Set(['active', 'read', 'broken']), `${path}.state`, issues);
	checkBoolean(item.favorite, `${path}.favorite`, issues);
	checkBoolean(item.archived, `${path}.archived`, issues);
	checkInteger(item.sortOrder, `${path}.sortOrder`, issues);
	checkDate(item.sourceDate, `${path}.sourceDate`, issues, true);
	checkDate(item.createdAt, `${path}.createdAt`, issues);
	checkDate(item.updatedAt, `${path}.updatedAt`, issues);
	checkEnum(item.type, new Set(['link', 'note', 'reminder']), `${path}.type`, issues);

	if (item.type === 'link') {
		const link = expectRecord(item.link, `${path}.link`, issues);
		if (link) {
			checkHttpUrl(link.originalUrl, `${path}.link.originalUrl`, issues);
			checkHttpUrl(link.normalizedUrl, `${path}.link.normalizedUrl`, issues);
			checkString(link.domain, `${path}.link.domain`, issues, false);
			checkNullableString(link.personalNotes, `${path}.link.personalNotes`, issues);
			checkNullableString(link.importedTitle, `${path}.link.importedTitle`, issues);
			checkNullableString(link.sourceType, `${path}.link.sourceType`, issues);
			validateMetadata(link.metadata, `${path}.link.metadata`, issues);
		}
	} else if (item.type === 'note') {
		const note = expectRecord(item.note, `${path}.note`, issues);
		if (note) checkString(note.body, `${path}.note.body`, issues);
	} else if (item.type === 'reminder') {
		const reminder = expectRecord(item.reminder, `${path}.reminder`, issues);
		if (reminder) {
			checkNullableString(reminder.description, `${path}.reminder.description`, issues);
			checkDate(reminder.dueAt, `${path}.reminder.dueAt`, issues);
			checkEnum(
				reminder.state,
				new Set(['pending', 'completed']),
				`${path}.reminder.state`,
				issues
			);
			checkNullableString(reminder.recurrence, `${path}.reminder.recurrence`, issues);
			checkString(reminder.timeZone, `${path}.reminder.timeZone`, issues, false);
			checkDate(reminder.completedAt, `${path}.reminder.completedAt`, issues, true);
			checkDate(reminder.lastNotifiedAt, `${path}.reminder.lastNotifiedAt`, issues, true);
		}
	}

	return { ...(id ? { id } : {}), collectionId, tagIds };
}

function checkUniqueIds(
	ids: Array<string | undefined>,
	path: string,
	issues: BackupValidationIssue[]
): Set<string> {
	const seen = new Set<string>();
	ids.forEach((id, index) => {
		if (!id) return;
		if (seen.has(id)) addIssue(issues, `${path}[${index}].id`, 'Duplicate ID');
		else seen.add(id);
	});
	return seen;
}

export function validatePastedBackup(
	value: unknown,
	limits: BackupRestoreLimits = { ...DEFAULT_BACKUP_RESTORE_LIMITS }
): PastedBackupV1 {
	const issues: BackupValidationIssue[] = [];
	const root = expectRecord(value, '$', issues);
	if (!root) throw new BackupValidationError(issues);
	if (root.format !== PASTED_BACKUP_FORMAT)
		addIssue(issues, '$.format', 'Unsupported backup format');
	if (root.version !== PASTED_BACKUP_VERSION)
		addIssue(issues, '$.version', 'Unsupported backup version');
	checkDate(root.exportedAt, '$.exportedAt', issues);

	const generator = expectRecord(root.generator, '$.generator', issues);
	if (generator) {
		if (generator.name !== 'Pasted') addIssue(issues, '$.generator.name', 'Expected Pasted');
		checkNullableString(generator.version, '$.generator.version', issues);
	}

	const manifest = expectRecord(root.manifest, '$.manifest', issues);
	if (manifest) {
		checkInteger(manifest.itemCount, '$.manifest.itemCount', issues, 0);
		checkInteger(manifest.collectionCount, '$.manifest.collectionCount', issues, 0);
		checkInteger(manifest.tagCount, '$.manifest.tagCount', issues, 0);
		validateSelection(manifest.selection, '$.manifest.selection', issues);
		validateFilters(manifest.filters, '$.manifest.filters', issues);
		validatePrivacy(manifest.privacy, '$.manifest.privacy', issues);
	}

	const data = expectRecord(root.data, '$.data', issues);
	const collections = data
		? expectArray(data.collections, '$.data.collections', issues)
		: undefined;
	const tags = data ? expectArray(data.tags, '$.data.tags', issues) : undefined;
	const items = data ? expectArray(data.items, '$.data.items', issues) : undefined;
	if (collections && collections.length > limits.maxCollections) {
		addIssue(issues, '$.data.collections', `Collection limit is ${limits.maxCollections}`);
	}
	if (tags && tags.length > limits.maxTags)
		addIssue(issues, '$.data.tags', `Tag limit is ${limits.maxTags}`);
	if (items && items.length > limits.maxItems)
		addIssue(issues, '$.data.items', `Item limit is ${limits.maxItems}`);

	const collectionIds = checkUniqueIds(
		(collections ?? []).map((entry, index) =>
			validateCollection(entry, `$.data.collections[${index}]`, issues)
		),
		'$.data.collections',
		issues
	);
	const tagIds = checkUniqueIds(
		(tags ?? []).map((entry, index) => validateTag(entry, `$.data.tags[${index}]`, issues)),
		'$.data.tags',
		issues
	);
	const itemReferences = (items ?? []).map((entry, index) =>
		validateItem(entry, `$.data.items[${index}]`, issues)
	);
	checkUniqueIds(
		itemReferences.map((reference) => reference.id),
		'$.data.items',
		issues
	);
	itemReferences.forEach((reference, index) => {
		if (reference.collectionId && !collectionIds.has(reference.collectionId)) {
			addIssue(
				issues,
				`$.data.items[${index}].collectionId`,
				'Collection does not exist in backup'
			);
		}
		reference.tagIds.forEach((tagId, tagIndex) => {
			if (!tagIds.has(tagId)) {
				addIssue(
					issues,
					`$.data.items[${index}].tagIds[${tagIndex}]`,
					'Tag does not exist in backup'
				);
			}
		});
	});

	if (manifest && collections && manifest.collectionCount !== collections.length) {
		addIssue(issues, '$.manifest.collectionCount', 'Count does not match backup data');
	}
	if (manifest && tags && manifest.tagCount !== tags.length) {
		addIssue(issues, '$.manifest.tagCount', 'Count does not match backup data');
	}
	if (manifest && items && manifest.itemCount !== items.length) {
		addIssue(issues, '$.manifest.itemCount', 'Count does not match backup data');
	}

	if (issues.length > 0) throw new BackupValidationError(issues);
	return value as PastedBackupV1;
}

export function parsePastedBackupJson(
	json: string,
	limits: BackupRestoreLimits = { ...DEFAULT_BACKUP_RESTORE_LIMITS }
): PastedBackupV1 {
	const size = new TextEncoder().encode(json).byteLength;
	if (size > limits.maxJsonBytes) {
		throw new BackupValidationError([
			{ path: '$', message: `Backup JSON exceeds the ${limits.maxJsonBytes} byte limit` }
		]);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(json) as unknown;
	} catch (error) {
		throw new BackupValidationError([{ path: '$', message: 'Backup is not valid JSON' }], {
			cause: error
		});
	}
	return validatePastedBackup(parsed, limits);
}
