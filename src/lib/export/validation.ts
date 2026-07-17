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

const MAX_TITLE_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_NOTE_BODY_LENGTH = 100_000;
const MAX_URL_LENGTH = 8_192;
const MAX_DOMAIN_LENGTH = 253;
const MAX_PERSONAL_NOTES_LENGTH = 20_000;
const MAX_SOURCE_TYPE_LENGTH = 100;
const MAX_RECURRENCE_LENGTH = 500;
const MAX_TIME_ZONE_LENGTH = 100;
const MAX_COLLECTION_NAME_LENGTH = 120;
const MAX_TAG_NAME_LENGTH = 80;
const MAX_ICON_LENGTH = 64;
const MAX_ITEM_TAGS = 50;
const MAX_FILTER_DOMAINS = 50;
const MAX_COLLECTION_SORT_ORDER = 1_000_000;
const MIN_DATABASE_INTEGER = -2_147_483_648;
const MAX_DATABASE_INTEGER = 2_147_483_647;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const ICON_PATTERN = /^[a-z0-9-]+$/i;
const ISO_TIMESTAMP_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/;

const ITEM_TYPES = new Set(['link', 'note', 'reminder']);
const ITEM_STATES = new Set(['active', 'read', 'broken']);
const REMINDER_STATES = new Set(['pending', 'completed']);
const METADATA_STATES = new Set(['pending', 'fetching', 'ready', 'failed', 'blocked']);

const ROOT_KEYS = new Set(['format', 'version', 'exportedAt', 'generator', 'manifest', 'data']);
const GENERATOR_KEYS = new Set(['name', 'version']);
const MANIFEST_KEYS = new Set([
	'itemCount',
	'collectionCount',
	'tagCount',
	'selection',
	'filters',
	'privacy'
]);
const SELECTION_KEYS = new Set(['kind', 'itemIds', 'query']);
const FILTER_KEYS = new Set([
	'collectionIds',
	'tagIds',
	'tagMatch',
	'types',
	'domains',
	'favorite',
	'archived',
	'createdFrom',
	'createdTo',
	'reminderStates'
]);
const PRIVACY_KEYS = new Set([
	'includePersonalNotes',
	'includeSourceDates',
	'includeLinkMetadata',
	'includeNoteBodies',
	'includeReminderDescriptions'
]);
const DATA_KEYS = new Set(['collections', 'tags', 'items']);
const COLLECTION_KEYS = new Set([
	'id',
	'name',
	'description',
	'color',
	'icon',
	'sortOrder',
	'sortMode',
	'createdAt',
	'updatedAt'
]);
const TAG_KEYS = new Set(['id', 'name', 'color', 'createdAt', 'updatedAt']);
const ITEM_BASE_KEYS = [
	'id',
	'type',
	'title',
	'description',
	'collectionId',
	'tagIds',
	'state',
	'favorite',
	'archived',
	'sortOrder',
	'sourceDate',
	'createdAt',
	'updatedAt'
] as const;
const LINK_ITEM_KEYS = new Set([...ITEM_BASE_KEYS, 'link']);
const NOTE_ITEM_KEYS = new Set([...ITEM_BASE_KEYS, 'note']);
const REMINDER_ITEM_KEYS = new Set([...ITEM_BASE_KEYS, 'reminder']);
const UNKNOWN_TYPE_ITEM_KEYS = new Set([...ITEM_BASE_KEYS, 'link', 'note', 'reminder']);
const LINK_KEYS = new Set([
	'originalUrl',
	'normalizedUrl',
	'domain',
	'personalNotes',
	'importedTitle',
	'sourceType',
	'metadata'
]);
const NOTE_KEYS = new Set(['body']);
const REMINDER_KEYS = new Set([
	'description',
	'dueAt',
	'state',
	'recurrence',
	'timeZone',
	'completedAt',
	'lastNotifiedAt'
]);
const METADATA_KEYS = new Set([
	'title',
	'description',
	'siteName',
	'state',
	'errorCode',
	'httpStatus',
	'lastFetchedAt'
]);

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

function childPath(path: string, key: string): string {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
		? `${path}.${key}`
		: `${path}[${JSON.stringify(key)}]`;
}

function expectRecord(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	knownKeys?: ReadonlySet<string>
): Record<string, unknown> | undefined {
	if (!isRecord(value)) {
		addIssue(issues, path, 'Expected an object');
		return undefined;
	}
	if (knownKeys) {
		for (const key of Object.keys(value)) {
			if (!knownKeys.has(key)) addIssue(issues, childPath(path, key), 'Unexpected property');
		}
	}
	return value;
}

function expectArray(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	maximum?: number
): unknown[] | undefined {
	if (!Array.isArray(value)) {
		addIssue(issues, path, 'Expected an array');
		return undefined;
	}
	if (maximum !== undefined && value.length > maximum) {
		addIssue(issues, path, `Array limit is ${maximum}`);
	}
	return value;
}

function checkString(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	allowEmpty = true,
	maximumLength?: number
): value is string {
	if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
		addIssue(issues, path, allowEmpty ? 'Expected a string' : 'Expected a non-empty string');
		return false;
	}
	if (maximumLength !== undefined && value.length > maximumLength) {
		addIssue(issues, path, `String limit is ${maximumLength} characters`);
		return false;
	}
	return true;
}

function checkNullableString(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	maximumLength?: number,
	allowEmpty = true
): value is string | null {
	if (value === null) return true;
	if (typeof value !== 'string') {
		addIssue(issues, path, 'Expected a string or null');
		return false;
	}
	if (!allowEmpty && value.trim() === '') {
		addIssue(issues, path, 'Expected a non-empty string or null');
		return false;
	}
	if (maximumLength !== undefined && value.length > maximumLength) {
		addIssue(issues, path, `String limit is ${maximumLength} characters`);
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
	minimum?: number,
	maximum?: number
): void {
	if (
		!Number.isSafeInteger(value) ||
		(minimum !== undefined && Number(value) < minimum) ||
		(maximum !== undefined && Number(value) > maximum)
	) {
		addIssue(issues, path, 'Expected an integer in the supported range');
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
): value is string {
	if (nullable && value === null) return false;
	if (typeof value !== 'string') {
		addIssue(
			issues,
			path,
			nullable ? 'Expected an ISO timestamp or null' : 'Expected an ISO timestamp'
		);
		return false;
	}
	const match = ISO_TIMESTAMP_PATTERN.exec(value);
	if (!match) {
		addIssue(issues, path, 'Expected an ISO timestamp with a UTC offset');
		return false;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = Number(match[6]);
	const offsetHour = Number(match[7] ?? 0);
	const offsetMinute = Number(match[8] ?? 0);
	const daysInMonth =
		year > 0 && month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
	if (
		year < 1 ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > daysInMonth ||
		hour > 23 ||
		minute > 59 ||
		second > 59 ||
		offsetHour > 23 ||
		offsetMinute > 59
	) {
		addIssue(issues, path, 'Expected a valid ISO timestamp');
		return false;
	}
	return true;
}

function checkUuid(value: unknown, path: string, issues: BackupValidationIssue[]): value is string {
	if (!checkString(value, path, issues, false)) return false;
	if (!UUID_PATTERN.test(value)) {
		addIssue(issues, path, 'Expected a UUID');
		return false;
	}
	return true;
}

function checkUuidArray(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	maximum: number
): string[] {
	const array = expectArray(value, path, issues, maximum);
	if (!array) return [];
	const result: string[] = [];
	const seen = new Set<string>();
	array.slice(0, maximum).forEach((entry, index) => {
		if (!checkUuid(entry, `${path}[${index}]`, issues)) return;
		if (seen.has(entry)) addIssue(issues, `${path}[${index}]`, 'Duplicate value');
		else {
			seen.add(entry);
			result.push(entry);
		}
	});
	return result;
}

function checkNullableUuidArray(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	maximum: number
): (string | null)[] {
	const array = expectArray(value, path, issues, maximum);
	if (!array) return [];
	const result: (string | null)[] = [];
	const seen = new Set<string>();
	array.slice(0, maximum).forEach((entry, index) => {
		if (entry !== null && !checkUuid(entry, `${path}[${index}]`, issues)) return;
		const key = entry === null ? '__null__' : entry;
		if (seen.has(key)) addIssue(issues, `${path}[${index}]`, 'Duplicate value');
		else {
			seen.add(key);
			result.push(entry);
		}
	});
	return result;
}

function checkStringArray(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	maximum: number,
	maximumStringLength?: number
): string[] {
	const array = expectArray(value, path, issues, maximum);
	if (!array) return [];
	const result: string[] = [];
	const seen = new Set<string>();
	array.slice(0, maximum).forEach((entry, index) => {
		if (!checkString(entry, `${path}[${index}]`, issues, false, maximumStringLength)) return;
		if (seen.has(entry)) addIssue(issues, `${path}[${index}]`, 'Duplicate value');
		else {
			seen.add(entry);
			result.push(entry);
		}
	});
	return result;
}

function checkNullableUuid(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): value is string | null {
	if (value === null) return true;
	return checkUuid(value, path, issues);
}

function checkColor(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	if (value === null) return;
	if (!checkString(value, path, issues, false, 7)) return;
	if (!COLOR_PATTERN.test(value)) addIssue(issues, path, 'Expected a six-digit hexadecimal color');
}

function checkIcon(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	if (value === null) return;
	if (!checkString(value, path, issues, false, MAX_ICON_LENGTH)) return;
	if (!ICON_PATTERN.test(value)) {
		addIssue(issues, path, 'Icon may contain only letters, numbers, and hyphens');
	}
}

function checkTimeZone(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	if (!checkString(value, path, issues, false, MAX_TIME_ZONE_LENGTH)) return;
	try {
		new Intl.DateTimeFormat('en', { timeZone: value });
	} catch {
		addIssue(issues, path, 'Expected a valid IANA time zone');
	}
}

function checkHttpUrl(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): URL | undefined {
	if (!checkString(value, path, issues, false, MAX_URL_LENGTH)) return undefined;
	try {
		const url = new URL(value);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			addIssue(issues, path, 'URL must use HTTP or HTTPS');
			return undefined;
		}
		if (url.username || url.password) {
			addIssue(issues, path, 'URL credentials are not allowed');
			return undefined;
		}
		return url;
	} catch {
		addIssue(issues, path, 'Expected a valid URL');
		return undefined;
	}
}

function validateSelection(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	maxItems: number
): void {
	const selection = expectRecord(value, path, issues, SELECTION_KEYS);
	if (!selection) return;
	checkEnum(selection.kind, new Set(['all', 'manual', 'search']), `${path}.kind`, issues);
	const itemIds = checkUuidArray(selection.itemIds, `${path}.itemIds`, issues, maxItems);
	checkNullableString(selection.query, `${path}.query`, issues, MAX_TITLE_LENGTH);
	if (selection.kind === 'all' && itemIds.length > 0) {
		addIssue(issues, `${path}.itemIds`, 'An all selection must not list item IDs');
	}
	if (selection.kind !== 'search' && selection.query !== null) {
		addIssue(issues, `${path}.query`, 'Only a search selection may include a query');
	}
}

function validateFilters(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[],
	limits: BackupRestoreLimits
): void {
	const filters = expectRecord(value, path, issues, FILTER_KEYS);
	if (!filters) return;
	checkNullableUuidArray(
		filters.collectionIds,
		`${path}.collectionIds`,
		issues,
		limits.maxCollections
	);
	checkUuidArray(filters.tagIds, `${path}.tagIds`, issues, limits.maxTags);
	checkEnum(filters.tagMatch, new Set(['any', 'all']), `${path}.tagMatch`, issues);
	const types = checkStringArray(filters.types, `${path}.types`, issues, ITEM_TYPES.size);
	types.forEach((type, index) => checkEnum(type, ITEM_TYPES, `${path}.types[${index}]`, issues));
	const domains = checkStringArray(
		filters.domains,
		`${path}.domains`,
		issues,
		MAX_FILTER_DOMAINS,
		MAX_DOMAIN_LENGTH
	);
	domains.forEach((domain, index) => {
		if (domain !== domain.toLowerCase()) {
			addIssue(issues, `${path}.domains[${index}]`, 'Domain must be lowercase');
		}
	});
	if (filters.favorite !== null) checkBoolean(filters.favorite, `${path}.favorite`, issues);
	if (filters.archived !== null) checkBoolean(filters.archived, `${path}.archived`, issues);
	const createdFromValid = checkDate(filters.createdFrom, `${path}.createdFrom`, issues, true);
	const createdToValid = checkDate(filters.createdTo, `${path}.createdTo`, issues, true);
	if (
		createdFromValid &&
		createdToValid &&
		Date.parse(filters.createdFrom as string) > Date.parse(filters.createdTo as string)
	) {
		addIssue(issues, `${path}.createdTo`, 'createdTo must not be earlier than createdFrom');
	}
	const reminderStates = checkStringArray(
		filters.reminderStates,
		`${path}.reminderStates`,
		issues,
		REMINDER_STATES.size
	);
	reminderStates.forEach((state, index) =>
		checkEnum(state, REMINDER_STATES, `${path}.reminderStates[${index}]`, issues)
	);
}

function validatePrivacy(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	const privacy = expectRecord(value, path, issues, PRIVACY_KEYS);
	if (!privacy) return;
	for (const key of PRIVACY_KEYS) checkBoolean(privacy[key], `${path}.${key}`, issues);
}

function validateCollection(
	value: unknown,
	path: string,
	issues: BackupValidationIssue[]
): string | undefined {
	const collection = expectRecord(value, path, issues, COLLECTION_KEYS);
	if (!collection) return undefined;
	const id = checkUuid(collection.id, `${path}.id`, issues) ? collection.id : undefined;
	checkString(collection.name, `${path}.name`, issues, false, MAX_COLLECTION_NAME_LENGTH);
	checkNullableString(
		collection.description,
		`${path}.description`,
		issues,
		MAX_DESCRIPTION_LENGTH
	);
	checkColor(collection.color, `${path}.color`, issues);
	checkIcon(collection.icon, `${path}.icon`, issues);
	checkInteger(
		collection.sortOrder,
		`${path}.sortOrder`,
		issues,
		-MAX_COLLECTION_SORT_ORDER,
		MAX_COLLECTION_SORT_ORDER
	);
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
	const tag = expectRecord(value, path, issues, TAG_KEYS);
	if (!tag) return undefined;
	const id = checkUuid(tag.id, `${path}.id`, issues) ? tag.id : undefined;
	checkString(tag.name, `${path}.name`, issues, false, MAX_TAG_NAME_LENGTH);
	checkColor(tag.color, `${path}.color`, issues);
	checkDate(tag.createdAt, `${path}.createdAt`, issues);
	checkDate(tag.updatedAt, `${path}.updatedAt`, issues);
	return id;
}

function validateMetadata(value: unknown, path: string, issues: BackupValidationIssue[]): void {
	if (value === null) return;
	const metadata = expectRecord(value, path, issues, METADATA_KEYS);
	if (!metadata) return;
	checkNullableString(metadata.title, `${path}.title`, issues, MAX_TITLE_LENGTH);
	checkNullableString(metadata.description, `${path}.description`, issues, 1_000);
	checkNullableString(metadata.siteName, `${path}.siteName`, issues, 200);
	checkEnum(metadata.state, METADATA_STATES, `${path}.state`, issues);
	checkNullableString(metadata.errorCode, `${path}.errorCode`, issues, MAX_SOURCE_TYPE_LENGTH);
	if (metadata.httpStatus !== null) {
		checkInteger(metadata.httpStatus, `${path}.httpStatus`, issues, 100, 599);
	}
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
	const untypedItem = expectRecord(value, path, issues);
	if (!untypedItem) return { collectionId: undefined, tagIds: [] };
	const itemKeys =
		untypedItem.type === 'link'
			? LINK_ITEM_KEYS
			: untypedItem.type === 'note'
				? NOTE_ITEM_KEYS
				: untypedItem.type === 'reminder'
					? REMINDER_ITEM_KEYS
					: UNKNOWN_TYPE_ITEM_KEYS;
	const item = expectRecord(value, path, issues, itemKeys);
	if (!item) return { collectionId: undefined, tagIds: [] };
	const id = checkUuid(item.id, `${path}.id`, issues) ? item.id : undefined;
	checkNullableString(item.title, `${path}.title`, issues, MAX_TITLE_LENGTH, false);
	checkNullableString(item.description, `${path}.description`, issues, MAX_DESCRIPTION_LENGTH);
	const collectionId = checkNullableUuid(item.collectionId, `${path}.collectionId`, issues)
		? item.collectionId
		: undefined;
	const tagIds = checkUuidArray(item.tagIds, `${path}.tagIds`, issues, MAX_ITEM_TAGS);
	checkEnum(item.state, ITEM_STATES, `${path}.state`, issues);
	checkBoolean(item.favorite, `${path}.favorite`, issues);
	checkBoolean(item.archived, `${path}.archived`, issues);
	checkInteger(
		item.sortOrder,
		`${path}.sortOrder`,
		issues,
		MIN_DATABASE_INTEGER,
		MAX_DATABASE_INTEGER
	);
	checkDate(item.sourceDate, `${path}.sourceDate`, issues, true);
	checkDate(item.createdAt, `${path}.createdAt`, issues);
	checkDate(item.updatedAt, `${path}.updatedAt`, issues);
	checkEnum(item.type, ITEM_TYPES, `${path}.type`, issues);

	if (item.type === 'link') {
		const link = expectRecord(item.link, `${path}.link`, issues, LINK_KEYS);
		if (link) {
			checkHttpUrl(link.originalUrl, `${path}.link.originalUrl`, issues);
			const normalizedUrl = checkHttpUrl(link.normalizedUrl, `${path}.link.normalizedUrl`, issues);
			const domain = link.domain;
			const domainValid = checkString(
				domain,
				`${path}.link.domain`,
				issues,
				false,
				MAX_DOMAIN_LENGTH
			);
			if (domainValid && domain !== domain.toLowerCase()) {
				addIssue(issues, `${path}.link.domain`, 'Domain must be lowercase');
			}
			if (
				normalizedUrl &&
				domainValid &&
				normalizedUrl.hostname.toLowerCase() !== domain.toLowerCase()
			) {
				addIssue(issues, `${path}.link.domain`, 'Domain must match the normalized URL');
			}
			checkNullableString(
				link.personalNotes,
				`${path}.link.personalNotes`,
				issues,
				MAX_PERSONAL_NOTES_LENGTH
			);
			checkNullableString(
				link.importedTitle,
				`${path}.link.importedTitle`,
				issues,
				MAX_TITLE_LENGTH,
				false
			);
			checkNullableString(
				link.sourceType,
				`${path}.link.sourceType`,
				issues,
				MAX_SOURCE_TYPE_LENGTH,
				false
			);
			validateMetadata(link.metadata, `${path}.link.metadata`, issues);
		}
	} else if (item.type === 'note') {
		const note = expectRecord(item.note, `${path}.note`, issues, NOTE_KEYS);
		if (note) {
			checkString(note.body, `${path}.note.body`, issues, true, MAX_NOTE_BODY_LENGTH);
		}
	} else if (item.type === 'reminder') {
		const reminder = expectRecord(item.reminder, `${path}.reminder`, issues, REMINDER_KEYS);
		if (reminder) {
			checkNullableString(
				reminder.description,
				`${path}.reminder.description`,
				issues,
				MAX_DESCRIPTION_LENGTH
			);
			checkDate(reminder.dueAt, `${path}.reminder.dueAt`, issues);
			checkEnum(reminder.state, REMINDER_STATES, `${path}.reminder.state`, issues);
			checkNullableString(
				reminder.recurrence,
				`${path}.reminder.recurrence`,
				issues,
				MAX_RECURRENCE_LENGTH,
				false
			);
			checkTimeZone(reminder.timeZone, `${path}.reminder.timeZone`, issues);
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

function checkUniqueNames(entries: unknown[], path: string, issues: BackupValidationIssue[]): void {
	const seen = new Set<string>();
	entries.forEach((entry, index) => {
		if (!isRecord(entry) || typeof entry.name !== 'string') return;
		if (seen.has(entry.name)) addIssue(issues, `${path}[${index}].name`, 'Duplicate name');
		else seen.add(entry.name);
	});
}

export function validatePastedBackup(
	value: unknown,
	limits: BackupRestoreLimits = { ...DEFAULT_BACKUP_RESTORE_LIMITS }
): PastedBackupV1 {
	const issues: BackupValidationIssue[] = [];
	const root = expectRecord(value, '$', issues, ROOT_KEYS);
	if (!root) throw new BackupValidationError(issues);
	if (root.format !== PASTED_BACKUP_FORMAT) {
		addIssue(issues, '$.format', 'Unsupported backup format');
	}
	if (root.version !== PASTED_BACKUP_VERSION) {
		addIssue(issues, '$.version', 'Unsupported backup version');
	}
	checkDate(root.exportedAt, '$.exportedAt', issues);

	const generator = expectRecord(root.generator, '$.generator', issues, GENERATOR_KEYS);
	if (generator) {
		if (generator.name !== 'Pasted') addIssue(issues, '$.generator.name', 'Expected Pasted');
		checkNullableString(generator.version, '$.generator.version', issues, MAX_SOURCE_TYPE_LENGTH);
	}

	const manifest = expectRecord(root.manifest, '$.manifest', issues, MANIFEST_KEYS);
	if (manifest) {
		checkInteger(manifest.itemCount, '$.manifest.itemCount', issues, 0, limits.maxItems);
		checkInteger(
			manifest.collectionCount,
			'$.manifest.collectionCount',
			issues,
			0,
			limits.maxCollections
		);
		checkInteger(manifest.tagCount, '$.manifest.tagCount', issues, 0, limits.maxTags);
		validateSelection(manifest.selection, '$.manifest.selection', issues, limits.maxItems);
		validateFilters(manifest.filters, '$.manifest.filters', issues, limits);
		validatePrivacy(manifest.privacy, '$.manifest.privacy', issues);
	}

	const data = expectRecord(root.data, '$.data', issues, DATA_KEYS);
	const collections = data
		? expectArray(data.collections, '$.data.collections', issues, limits.maxCollections)
		: undefined;
	const tags = data ? expectArray(data.tags, '$.data.tags', issues, limits.maxTags) : undefined;
	const items = data ? expectArray(data.items, '$.data.items', issues, limits.maxItems) : undefined;

	const collectionIds = checkUniqueIds(
		(collections ?? [])
			.slice(0, limits.maxCollections)
			.map((entry, index) => validateCollection(entry, `$.data.collections[${index}]`, issues)),
		'$.data.collections',
		issues
	);
	const tagIds = checkUniqueIds(
		(tags ?? [])
			.slice(0, limits.maxTags)
			.map((entry, index) => validateTag(entry, `$.data.tags[${index}]`, issues)),
		'$.data.tags',
		issues
	);
	checkUniqueNames(
		(collections ?? []).slice(0, limits.maxCollections),
		'$.data.collections',
		issues
	);
	checkUniqueNames((tags ?? []).slice(0, limits.maxTags), '$.data.tags', issues);
	const itemReferences = (items ?? [])
		.slice(0, limits.maxItems)
		.map((entry, index) => validateItem(entry, `$.data.items[${index}]`, issues));
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

export function assertPastedBackupJsonSize(
	value: unknown,
	limits: BackupRestoreLimits = { ...DEFAULT_BACKUP_RESTORE_LIMITS }
): number {
	let json: string;
	try {
		json = typeof value === 'string' ? value : JSON.stringify(value);
	} catch (error) {
		throw new BackupValidationError([{ path: '$', message: 'Backup is not valid JSON' }], {
			cause: error
		});
	}
	if (typeof json !== 'string') {
		throw new BackupValidationError([{ path: '$', message: 'Backup is not valid JSON' }]);
	}
	const size = new TextEncoder().encode(json).byteLength;
	if (size > limits.maxJsonBytes) {
		throw new BackupValidationError([
			{ path: '$', message: `Backup JSON exceeds the ${limits.maxJsonBytes} byte limit` }
		]);
	}
	return size;
}

export function parsePastedBackupJson(
	json: string,
	limits: BackupRestoreLimits = { ...DEFAULT_BACKUP_RESTORE_LIMITS }
): PastedBackupV1 {
	assertPastedBackupJsonSize(json, limits);
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
