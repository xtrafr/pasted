import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import {
	BACKUP_JSON_FILENAME,
	BACKUP_README_FILENAME,
	BackupValidationError,
	DEFAULT_BACKUP_RESTORE_LIMITS,
	PASTED_BACKUP_FORMAT,
	PASTED_BACKUP_VERSION,
	createBackupZip,
	createExportArtifact,
	createPastedBackup,
	escapeCsvCell,
	estimateExportSize,
	parsePastedBackupJson,
	parsePastedBackupZip,
	selectExportData,
	serializeCsv,
	serializeMarkdown,
	serializeNetscapeBookmarks,
	serializePastedJson,
	serializeSimpleJson,
	serializeTxt,
	validatePastedBackup,
	type BackupRestoreLimits,
	type ExportFormat,
	type ExportSourceData,
	type PastedBackupV1
} from './index';

const EXPORTED_AT = '2026-07-17T10:30:00.000Z';
const IDS = {
	readingCollection: '10000000-0000-4000-8000-000000000001',
	emptyCollection: '10000000-0000-4000-8000-000000000002',
	workTag: '20000000-0000-4000-8000-000000000001',
	specialTag: '20000000-0000-4000-8000-000000000002',
	firstLink: '30000000-0000-4000-8000-000000000001',
	secondLink: '30000000-0000-4000-8000-000000000002',
	note: '30000000-0000-4000-8000-000000000003',
	reminder: '30000000-0000-4000-8000-000000000004'
} as const;

const source: ExportSourceData = {
	collections: [
		{
			id: IDS.readingCollection,
			name: 'Reading, later',
			description: 'Things to review',
			color: '#4f46e5',
			icon: 'book',
			sortOrder: 1,
			sortMode: 'manual',
			createdAt: '2026-01-01T08:00:00.000Z',
			updatedAt: '2026-06-01T08:00:00.000Z'
		},
		{
			id: IDS.emptyCollection,
			name: 'Empty collection',
			description: null,
			color: null,
			icon: null,
			sortOrder: 2,
			sortMode: 'created_at',
			createdAt: '2026-02-01T08:00:00.000Z',
			updatedAt: '2026-02-01T08:00:00.000Z'
		}
	],
	tags: [
		{
			id: IDS.workTag,
			name: 'Work',
			color: '#0f766e',
			createdAt: '2026-01-02T08:00:00.000Z',
			updatedAt: '2026-01-02T08:00:00.000Z'
		},
		{
			id: IDS.specialTag,
			name: '=Formula, tag',
			color: null,
			createdAt: '2026-01-03T08:00:00.000Z',
			updatedAt: '2026-01-03T08:00:00.000Z'
		}
	],
	items: [
		{
			id: IDS.firstLink,
			type: 'link',
			title: 'A "quoted", title',
			description: 'First line\nSecond line',
			collectionId: IDS.readingCollection,
			tagIds: [IDS.workTag, IDS.specialTag],
			state: 'active',
			favorite: true,
			archived: false,
			sortOrder: 1,
			sourceDate: '2025-12-20T12:00:00.000Z',
			createdAt: '2026-03-01T09:00:00.000Z',
			updatedAt: '2026-03-02T09:00:00.000Z',
			link: {
				originalUrl: 'https://example.com/article?a=1&b=2',
				normalizedUrl: 'https://example.com/article?a=1&b=2',
				domain: 'example.com',
				personalNotes: 'Private note',
				importedTitle: 'Imported title',
				sourceType: 'browser',
				metadata: {
					title: 'Fetched title',
					description: 'Fetched description',
					siteName: 'Example',
					state: 'ready',
					errorCode: null,
					httpStatus: 200,
					lastFetchedAt: '2026-03-02T08:30:00.000Z'
				}
			}
		},
		{
			id: IDS.secondLink,
			type: 'link',
			title: '=SUM(A1:A2)',
			description: null,
			collectionId: null,
			tagIds: [],
			state: 'read',
			favorite: false,
			archived: true,
			sortOrder: 2,
			sourceDate: null,
			createdAt: '2026-04-01T09:00:00.000Z',
			updatedAt: '2026-04-02T09:00:00.000Z',
			link: {
				originalUrl: 'https://docs.example.org/start',
				normalizedUrl: 'https://docs.example.org/start',
				domain: 'docs.example.org',
				personalNotes: null,
				importedTitle: null,
				sourceType: null,
				metadata: null
			}
		},
		{
			id: IDS.note,
			type: 'note',
			title: 'Release checklist',
			description: 'A fake note',
			collectionId: null,
			tagIds: [IDS.workTag],
			state: 'active',
			favorite: false,
			archived: false,
			sortOrder: 3,
			sourceDate: '2026-04-03T09:00:00.000Z',
			createdAt: '2026-04-04T09:00:00.000Z',
			updatedAt: '2026-04-05T09:00:00.000Z',
			note: { body: 'Check **tests**.\n\nThen publish.' }
		},
		{
			id: IDS.reminder,
			type: 'reminder',
			title: 'Review export',
			description: null,
			collectionId: IDS.readingCollection,
			tagIds: [IDS.workTag],
			state: 'active',
			favorite: false,
			archived: false,
			sortOrder: 4,
			sourceDate: '2026-04-06T09:00:00.000Z',
			createdAt: '2026-04-07T09:00:00.000Z',
			updatedAt: '2026-04-08T09:00:00.000Z',
			reminder: {
				description: 'Open the fake report',
				dueAt: '2026-08-01T15:00:00.000Z',
				state: 'pending',
				recurrence: null,
				timeZone: 'Europe/Madrid',
				completedAt: null,
				lastNotifiedAt: null
			}
		}
	]
};

function cloneBackup(): PastedBackupV1 {
	return structuredClone(createPastedBackup(source, { exportedAt: EXPORTED_AT }));
}

function limits(overrides: Partial<BackupRestoreLimits>): BackupRestoreLimits {
	return { ...DEFAULT_BACKUP_RESTORE_LIMITS, ...overrides };
}

function required<T>(value: T | undefined, label: string): T {
	if (value === undefined) throw new Error(`Missing test fixture value: ${label}`);
	return value;
}

function validationPaths(value: unknown): string[] {
	try {
		validatePastedBackup(value);
		expect.unreachable('Expected backup validation to fail');
	} catch (error) {
		expect(error).toBeInstanceOf(BackupValidationError);
		return (error as BackupValidationError).issues.map(({ path }) => path);
	}
}

describe('versioned Pasted backup', () => {
	it('round trips every restorable field and retains empty taxonomy', () => {
		const json = serializePastedJson(source, {
			exportedAt: EXPORTED_AT,
			generatorVersion: '1.2.3'
		});
		const restored = parsePastedBackupJson(json);

		expect(restored).toEqual(
			createPastedBackup(source, { exportedAt: EXPORTED_AT, generatorVersion: '1.2.3' })
		);
		expect(restored.format).toBe(PASTED_BACKUP_FORMAT);
		expect(restored.version).toBe(PASTED_BACKUP_VERSION);
		expect(restored.manifest).toMatchObject({
			itemCount: 4,
			collectionCount: 2,
			tagCount: 2
		});
		expect(restored.data.collections.map(({ id }) => id)).toContain(IDS.emptyCollection);
		expect(json).not.toContain('userId');
	});

	it('validates version, IDs, references, URLs, JSON syntax, and size before restore', () => {
		const broken = cloneBackup() as unknown as Record<string, unknown>;
		broken.version = 99;
		const data = broken.data as PastedBackupV1['data'];
		const first = required(data.items[0], 'first backup item');
		const second = required(data.items[1], 'second backup item');
		second.id = first.id;
		first.collectionId = 'missing-collection';
		if (first.type === 'link') first.link.originalUrl = 'javascript:alert(1)';

		try {
			validatePastedBackup(broken);
			expect.unreachable('Expected validation to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(BackupValidationError);
			const paths = (error as BackupValidationError).issues.map(({ path }) => path);
			expect(paths).toContain('$.version');
			expect(paths).toContain('$.data.items[1].id');
			expect(paths).toContain('$.data.items[0].collectionId');
			expect(paths).toContain('$.data.items[0].link.originalUrl');
		}

		expect(() => parsePastedBackupJson('{nope')).toThrow(BackupValidationError);
		expect(() =>
			parsePastedBackupJson(
				serializePastedJson(source, { exportedAt: EXPORTED_AT }),
				limits({ maxJsonBytes: 10 })
			)
		).toThrow(/byte limit/);
	});

	it('rejects unknown properties throughout the versioned shape', () => {
		const broken = cloneBackup() as unknown as Record<string, unknown>;
		broken.unexpected = true;
		const data = broken.data as PastedBackupV1['data'];
		const first = required(data.items[0], 'first backup item');
		(first as unknown as Record<string, unknown>).note = { body: 'Wrong variant' };
		if (first.type !== 'link' || first.link.metadata === null) {
			throw new Error('Expected a link fixture with metadata');
		}
		(first.link.metadata as unknown as Record<string, unknown>).ownerId = 'private';

		const paths = validationPaths(broken);
		expect(paths).toContain('$.unexpected');
		expect(paths).toContain('$.data.items[0].note');
		expect(paths).toContain('$.data.items[0].link.metadata.ownerId');
	});

	it('enforces CRUD string limits on restorable fields', () => {
		const broken = cloneBackup();
		broken.data.collections[0]!.name = 'c'.repeat(121);
		broken.data.tags[0]!.name = 't'.repeat(81);
		broken.data.items[0]!.title = 'i'.repeat(301);
		const link = broken.data.items.find((item) => item.type === 'link');
		if (!link || link.type !== 'link') throw new Error('Expected a link fixture');
		link.link.personalNotes = 'p'.repeat(20_001);

		const paths = validationPaths(broken);
		expect(paths).toContain('$.data.collections[0].name');
		expect(paths).toContain('$.data.tags[0].name');
		expect(paths).toContain('$.data.items[0].title');
		expect(paths).toContain('$.data.items[0].link.personalNotes');
	});

	it('rejects invalid colors, UUIDs, timestamps, and IANA time zones', () => {
		const broken = cloneBackup();
		broken.data.collections[0]!.color = 'indigo';
		broken.data.tags[0]!.id = 'not-a-uuid';
		broken.data.items[0]!.tagIds = ['also-not-a-uuid'];
		broken.data.items[0]!.createdAt = '2026-02-30T09:00:00.000Z';
		const reminder = broken.data.items.find((item) => item.type === 'reminder');
		if (!reminder || reminder.type !== 'reminder') throw new Error('Expected a reminder fixture');
		reminder.reminder.timeZone = 'Mars/Olympus';

		const paths = validationPaths(broken);
		expect(paths).toContain('$.data.collections[0].color');
		expect(paths).toContain('$.data.tags[0].id');
		expect(paths).toContain('$.data.items[0].tagIds[0]');
		expect(paths).toContain('$.data.items[0].createdAt');
		expect(paths).toContain('$.data.items[3].reminder.timeZone');
	});

	it('rejects URL credentials and a domain that differs from the normalized URL', () => {
		const broken = cloneBackup();
		const link = broken.data.items.find((item) => item.type === 'link');
		if (!link || link.type !== 'link') throw new Error('Expected a link fixture');
		link.link.originalUrl = 'https://person:secret@example.com/private';
		link.link.domain = 'other.example';

		const paths = validationPaths(broken);
		expect(paths).toContain('$.data.items[0].link.originalUrl');
		expect(paths).toContain('$.data.items[0].link.domain');
	});

	it('enforces archive types and relationship cardinality', () => {
		const broken = cloneBackup();
		const first = required(broken.data.items[0], 'first backup item');
		(first as unknown as Record<string, unknown>).archived = 'yes';
		first.tagIds = Array.from(
			{ length: 51 },
			(_, index) => `40000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
		);

		const paths = validationPaths(broken);
		expect(paths).toContain('$.data.items[0].archived');
		expect(paths).toContain('$.data.items[0].tagIds');
	});

	it('rejects duplicate taxonomy names that would collapse during restore', () => {
		const broken = cloneBackup();
		broken.data.collections[1]!.name = broken.data.collections[0]!.name;
		broken.data.tags[1]!.name = broken.data.tags[0]!.name;

		const paths = validationPaths(broken);
		expect(paths).toContain('$.data.collections[1].name');
		expect(paths).toContain('$.data.tags[1].name');
	});
});

describe('selection, filters, and privacy', () => {
	it('combines selection with collection, tags, type, domain, favorite, and dates', () => {
		const selected = selectExportData(
			source,
			{
				kind: 'search',
				itemIds: [IDS.firstLink, IDS.secondLink, IDS.note],
				query: 'fake query'
			},
			{
				collectionIds: [IDS.readingCollection],
				tagIds: [IDS.workTag, IDS.specialTag],
				tagMatch: 'all',
				types: ['link'],
				domains: ['EXAMPLE.COM'],
				favorite: true,
				archived: false,
				createdFrom: '2026-02-01T00:00:00.000Z',
				createdTo: '2026-03-31T23:59:59.999Z'
			}
		);

		expect(selected.data.items.map(({ id }) => id)).toEqual([IDS.firstLink]);
		expect(selected.data.collections.map(({ id }) => id)).toEqual([IDS.readingCollection]);
		expect(selected.data.tags.map(({ id }) => id)).toEqual([IDS.workTag, IDS.specialTag]);
		expect(selected.selection).toEqual({
			kind: 'search',
			itemIds: [IDS.firstLink, IDS.secondLink, IDS.note],
			query: 'fake query'
		});
		expect(selected.filters.domains).toEqual(['example.com']);
	});

	it('supports manual reminder selection and privacy exclusions without mutating input', () => {
		const backup = createPastedBackup(source, {
			exportedAt: EXPORTED_AT,
			selection: { kind: 'manual', itemIds: [IDS.note, IDS.reminder] },
			filters: { reminderStates: ['pending'] },
			privacy: {
				includePersonalNotes: false,
				includeSourceDates: false,
				includeLinkMetadata: false,
				includeNoteBodies: false,
				includeReminderDescriptions: false
			}
		});

		expect(backup.data.items.map(({ id }) => id)).toEqual([IDS.reminder]);
		const reminder = required(backup.data.items[0], 'selected reminder');
		expect(reminder.sourceDate).toBeNull();
		expect(reminder.type).toBe('reminder');
		if (reminder.type === 'reminder') expect(reminder.reminder.description).toBeNull();
		expect(backup.manifest.privacy).toEqual({
			includePersonalNotes: false,
			includeSourceDates: false,
			includeLinkMetadata: false,
			includeNoteBodies: false,
			includeReminderDescriptions: false
		});
		const sourceReminder = required(source.items[3], 'source reminder');
		expect(sourceReminder.sourceDate).toBe('2026-04-06T09:00:00.000Z');
		if (sourceReminder.type === 'reminder') {
			expect(sourceReminder.reminder.description).toBe('Open the fake report');
		}
	});

	it('removes each private payload in an all-items export', () => {
		const backup = createPastedBackup(source, {
			exportedAt: EXPORTED_AT,
			privacy: {
				includePersonalNotes: false,
				includeSourceDates: false,
				includeLinkMetadata: false,
				includeNoteBodies: false,
				includeReminderDescriptions: false
			}
		});
		const link = backup.data.items.find(({ id }) => id === IDS.firstLink);
		const note = backup.data.items.find(({ id }) => id === IDS.note);
		const reminder = backup.data.items.find(({ id }) => id === IDS.reminder);

		expect(backup.data.items.every((item) => item.sourceDate === null)).toBe(true);
		if (link?.type === 'link') {
			expect(link.link.personalNotes).toBeNull();
			expect(link.link.metadata).toBeNull();
		}
		if (note?.type === 'note') expect(note.note.body).toBe('');
		if (reminder?.type === 'reminder') expect(reminder.reminder.description).toBeNull();
	});
});

describe('portable serializers', () => {
	it('creates readable simple JSON with resolved collection and tag names', () => {
		const parsed = JSON.parse(serializeSimpleJson(source, { exportedAt: EXPORTED_AT })) as Record<
			string,
			unknown
		>[];
		expect(parsed).toHaveLength(4);
		expect(parsed[0]).toMatchObject({
			type: 'link',
			collection: 'Reading, later',
			tags: ['Work', '=Formula, tag'],
			url: 'https://example.com/article?a=1&b=2',
			content: 'Private note'
		});
		expect(parsed[2]).toMatchObject({
			type: 'note',
			collection: 'Unorganized',
			content: 'Check **tests**.\n\nThen publish.'
		});
		expect(parsed[3]).toMatchObject({
			type: 'reminder',
			dueAt: '2026-08-01T15:00:00.000Z',
			reminderState: 'pending'
		});
	});

	it('quotes CSV safely and protects spreadsheet formulas by default', () => {
		const csv = serializeCsv(source, { exportedAt: EXPORTED_AT });
		expect(csv).toContain('"A ""quoted"", title"');
		expect(csv).toContain('"First line\nSecond line"');
		expect(csv).toContain("link,'=SUM(A1:A2),");
		expect(csv).toContain('"Work, =Formula, tag"');
		expect(csv.endsWith('\r\n')).toBe(true);
		expect(escapeCsvCell('a,"b"')).toBe('"a,""b"""');

		const unprotected = serializeCsv(source, {
			exportedAt: EXPORTED_AT,
			protectCsvFormulas: false
		});
		expect(unprotected).toContain('link,=SUM(A1:A2),');
	});

	it('writes URL-per-line TXT with optional one-line titles', () => {
		expect(serializeTxt(source, { exportedAt: EXPORTED_AT })).toBe(
			'https://example.com/article?a=1&b=2\nhttps://docs.example.org/start\n'
		);
		expect(serializeTxt(source, { exportedAt: EXPORTED_AT, includeTitlesInTxt: true })).toBe(
			'A "quoted", title\thttps://example.com/article?a=1&b=2\n=SUM(A1:A2)\thttps://docs.example.org/start\n'
		);
	});

	it('groups Markdown by collection and includes links, notes, and reminders', () => {
		const markdown = serializeMarkdown(source, { exportedAt: EXPORTED_AT });
		expect(markdown).toContain('# Pasted export');
		expect(markdown).toContain('## Reading, later');
		expect(markdown).toContain('[A "quoted", title](<https://example.com/article?a=1&b=2>)');
		expect(markdown).toContain('- [ ] **Review export**. Due: 2026-08-01T15:00:00.000Z.');
		expect(markdown).toContain('## Unorganized');
		expect(markdown).toContain('### Release checklist');
		expect(markdown).toContain('Check **tests**.\n\nThen publish.');
	});

	it('creates Netscape bookmarks HTML with escaped URLs and collection folders', () => {
		const html = serializeNetscapeBookmarks(source, { exportedAt: EXPORTED_AT });
		expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
		expect(html).toContain('<DT><H3>Reading, later</H3>');
		expect(html).toContain('HREF="https://example.com/article?a=1&amp;b=2"');
		expect(html).toContain('>A &quot;quoted&quot;, title</A>');
		expect(html).toContain('<DT><H3>Unorganized</H3>');
		expect(html.match(/<DT><A /g)).toHaveLength(2);
		expect(html).not.toContain('Release checklist');
	});
});

describe('ZIP backup and export artifacts', () => {
	it('creates a ZIP containing JSON plus a data-free README and restores it in memory', () => {
		const bytes = createBackupZip(source, { exportedAt: EXPORTED_AT });
		const files = unzipSync(bytes);
		const readme = required(files[BACKUP_README_FILENAME], 'backup README');

		expect(Object.keys(files).sort()).toEqual(
			[BACKUP_README_FILENAME, BACKUP_JSON_FILENAME].sort()
		);
		expect(strFromU8(readme)).toContain('Items: 4');
		expect(strFromU8(readme)).not.toContain('Private note');
		expect(parsePastedBackupZip(bytes)).toEqual(
			createPastedBackup(source, { exportedAt: EXPORTED_AT })
		);
	});

	it('rejects missing JSON, oversized archives, and excessive uncompressed output', () => {
		const readmeOnly = zipSync({ [BACKUP_README_FILENAME]: strToU8('No backup here') });
		expect(() => parsePastedBackupZip(readmeOnly)).toThrow(BACKUP_JSON_FILENAME);

		const bytes = createBackupZip(source, { exportedAt: EXPORTED_AT });
		expect(() => parsePastedBackupZip(bytes, limits({ maxZipBytes: 1 }))).toThrow(/ZIP exceeds/);
		expect(() => parsePastedBackupZip(bytes, limits({ maxUncompressedBytes: 10 }))).toThrow(
			/uncompressed byte limit/
		);
	});

	it('builds named artifacts and reports exact UTF-8 sizes for every format', () => {
		const formats: ExportFormat[] = [
			'pasted-json',
			'simple-json',
			'csv',
			'txt',
			'markdown',
			'netscape-bookmarks',
			'zip'
		];
		const expectedExtensions = ['.pasted.json', '.json', '.csv', '.txt', '.md', '.html', '.zip'];

		formats.forEach((format, index) => {
			const options = {
				exportedAt: EXPORTED_AT,
				filenameBase: 'My Export / 2026'
			};
			const artifact = createExportArtifact(format, source, options);
			expect(artifact.filename).toBe(`my-export-2026-2026-07-17${expectedExtensions[index]}`);
			expect(artifact.sizeBytes).toBeGreaterThan(0);
			expect(artifact.itemCount).toBe(4);
			expect(estimateExportSize(format, source, options)).toBe(artifact.sizeBytes);
		});
	});
});
