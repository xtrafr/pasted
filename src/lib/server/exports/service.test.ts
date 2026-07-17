import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
	listCollections: vi.fn(),
	listItems: vi.fn(),
	listTags: vi.fn()
}));

vi.mock('$lib/server/services', () => serviceMocks);

import { buildAccountExport } from './service';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const COLLECTION_ID = '20000000-0000-4000-8000-000000000001';
const TAG_ID = '30000000-0000-4000-8000-000000000001';
const IMPORT_ID = '40000000-0000-4000-8000-000000000001';

describe('account export service', () => {
	beforeEach(() => {
		serviceMocks.listCollections.mockReset().mockResolvedValue([]);
		serviceMocks.listTags.mockReset().mockResolvedValue([]);
		serviceMocks.listItems.mockReset().mockResolvedValue({ items: [], nextCursor: undefined });
	});

	it('applies every active library filter to a search export', async () => {
		const artifact = await buildAccountExport(USER_ID, {
			format: 'pasted-json',
			scope: 'search',
			query: 'release notes',
			collectionId: COLLECTION_ID,
			domain: 'EXAMPLE.COM',
			types: ['link', 'note'],
			tagIds: [TAG_ID],
			tagMode: 'all',
			sourceImportId: IMPORT_ID,
			favorite: true,
			archived: true,
			createdFrom: '2026-01-01T00:00:00.000Z',
			createdTo: '2026-07-17T23:59:59.999Z'
		});

		const searchCall = serviceMocks.listItems.mock.calls.find(
			([, input]) => input.query === 'release notes'
		);
		expect(searchCall?.[1]).toMatchObject({
			query: 'release notes',
			collectionId: COLLECTION_ID,
			domains: ['example.com'],
			types: ['link', 'note'],
			tagIds: [TAG_ID],
			tagMode: 'all',
			sourceImportId: IMPORT_ID,
			favorite: true,
			archived: true,
			createdFrom: '2026-01-01T00:00:00.000Z',
			createdTo: '2026-07-17T23:59:59.999Z'
		});
		expect(typeof artifact.data).toBe('string');
		const backup = JSON.parse(String(artifact.data));
		expect(backup.manifest.filters).toMatchObject({
			collectionIds: [COLLECTION_ID],
			domains: ['example.com'],
			types: ['link', 'note'],
			tagIds: [TAG_ID],
			tagMatch: 'all',
			favorite: true,
			archived: true,
			createdFrom: '2026-01-01T00:00:00.000Z',
			createdTo: '2026-07-17T23:59:59.999Z'
		});
	});

	it('uses the normalized URL when exporting a schemeless saved link', async () => {
		serviceMocks.listItems
			.mockResolvedValueOnce({
				items: [
					{
						id: '50000000-0000-4000-8000-000000000001',
						type: 'link',
						title: 'Draft guide',
						description: null,
						collectionId: null,
						state: 'active',
						favorite: false,
						archived: false,
						sortOrder: 0,
						sourceDate: null,
						createdAt: new Date('2026-07-17T10:00:00.000Z'),
						updatedAt: new Date('2026-07-17T10:00:00.000Z'),
						originalUrl: 'docs.example.org/guide_(draft)',
						normalizedUrl: 'https://docs.example.org/guide_(draft)',
						domain: 'docs.example.org',
						personalNotes: null,
						importedTitle: null,
						sourceType: 'whatsapp',
						metadataState: null,
						metadataTitle: null,
						metadataDescription: null,
						siteName: null,
						metadataErrorCode: null,
						httpStatus: null,
						lastFetchedAt: null,
						noteBody: null,
						reminderDescription: null,
						dueAt: null,
						reminderState: null,
						recurrence: null,
						timeZone: null,
						completedAt: null,
						lastNotifiedAt: null,
						tags: []
					}
				],
				nextCursor: undefined
			})
			.mockResolvedValueOnce({ items: [], nextCursor: undefined });

		const artifact = await buildAccountExport(USER_ID, {
			format: 'pasted-json',
			scope: 'all'
		});

		const backup = JSON.parse(String(artifact.data));
		expect(backup.data.items[0].link).toMatchObject({
			originalUrl: 'https://docs.example.org/guide_(draft)',
			normalizedUrl: 'https://docs.example.org/guide_(draft)'
		});
	});

	it('rejects an account export when another page exists at the item limit', async () => {
		serviceMocks.listItems.mockResolvedValueOnce({
			items: Array.from({ length: 100_000 }, () => ({})),
			nextCursor: 'another-page'
		});

		await expect(
			buildAccountExport(USER_ID, { format: 'simple-json', scope: 'all' })
		).rejects.toThrow('Account exports are limited to 100,000 items');
	});
});
