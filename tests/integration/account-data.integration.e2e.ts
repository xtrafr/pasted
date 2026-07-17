import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

import {
	createBackupZip,
	parsePastedBackupJson,
	parsePastedBackupZip,
	type PastedBackupV1
} from '../../src/lib/export';
import { signInRequest } from '../helpers/auth';
import {
	inspectTestDatabase,
	queryTestDatabase,
	removeTestAccounts,
	seedTestAccount,
	type TestAccount
} from '../helpers/database';

interface ApiEnvelope<T> {
	ok: boolean;
	data: T;
}

interface CreatedItem {
	id: string;
	type: 'link' | 'note' | 'reminder';
	title: string | null;
	collectionId: string | null;
	tags: Array<{ id: string; name: string }>;
	targetId?: string | null;
}

interface ImportSnapshot {
	id: string;
	idempotency: { replayed: boolean };
	progress: { imported: number };
	results: Array<{
		candidateKey: string;
		state: string;
		selected: boolean;
	}>;
}

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

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const database = await inspectTestDatabase();
const accountA: TestAccount = {
	id: 'pw_integration_account_a',
	name: 'Integration Account A',
	email: 'pw-integration-a@example.test',
	password: 'fake-password-a-2026'
};
const accountB: TestAccount = {
	id: 'pw_integration_account_b',
	name: 'Integration Account B',
	email: 'pw-integration-b@example.test',
	password: 'fake-password-b-2026'
};

let apiA: APIRequestContext;
let apiB: APIRequestContext;
let collectionId = '';
let tagId = '';
let linkId = '';

async function dataFrom<T>(response: APIResponse, expectedStatus = 200): Promise<T> {
	expect(response.status()).toBe(expectedStatus);
	const envelope = (await response.json()) as ApiEnvelope<T>;
	expect(envelope.ok).toBe(true);
	return envelope.data;
}

test.describe('authenticated account integration', () => {
	test.describe.configure({ mode: 'serial' });
	test.skip(!database.available, database.reason);

	test.beforeAll(async () => {
		await seedTestAccount(accountA);
		await seedTestAccount(accountB);
		apiA = await signInRequest(baseURL, accountA);
		apiB = await signInRequest(baseURL, accountB);
	});

	test.afterAll(async () => {
		await apiA?.dispose();
		await apiB?.dispose();
		await removeTestAccounts([accountA, accountB]);
	});

	test('creates every core item type and keeps account data separate', async () => {
		const collection = await dataFrom<{ id: string; name: string }>(
			await apiA.post('/api/v1/collections', {
				data: {
					name: 'Account A research',
					description: 'Fully fake integration collection',
					color: '#d8ff78'
				}
			}),
			201
		);
		collectionId = collection.id;

		const tag = await dataFrom<{ id: string; name: string }>(
			await apiA.post('/api/v1/tags', {
				data: { name: 'integration-only', color: '#e7dfd3' }
			}),
			201
		);
		tagId = tag.id;

		const link = await dataFrom<CreatedItem>(
			await apiA.post('/api/v1/links', {
				data: {
					originalUrl: 'https://integration.example.test/account-a',
					title: 'Account A link',
					personalNotes: 'Fictional integration note',
					collectionId,
					tagIds: [tagId]
				}
			}),
			201
		);
		linkId = link.id;

		const note = await dataFrom<CreatedItem>(
			await apiA.post('/api/v1/notes', {
				data: {
					title: 'Account A note',
					body: 'This fake note belongs only to account A.',
					collectionId,
					tagIds: [tagId]
				}
			}),
			201
		);

		const reminder = await dataFrom<CreatedItem>(
			await apiA.post('/api/v1/reminders', {
				data: {
					title: 'Account A reminder',
					description: 'Review the fake integration note',
					dueAt: '2027-02-03T10:00:00.000Z',
					timeZone: 'Europe/Madrid',
					collectionId,
					tagIds: [tagId]
				}
			}),
			201
		);

		expect([link.type, note.type, reminder.type]).toEqual(['link', 'note', 'reminder']);
		expect(link.collectionId).toBe(collectionId);
		expect(link.tags).toEqual([expect.objectContaining({ id: tagId })]);

		const accountAItems = await dataFrom<{ items: CreatedItem[] }>(
			await apiA.get('/api/v1/items?limit=100')
		);
		expect(accountAItems.items.map((item) => item.type).toSorted()).toEqual([
			'link',
			'note',
			'reminder'
		]);
		expect(JSON.stringify(accountAItems)).not.toContain('userId');

		const accountBItems = await dataFrom<{ items: CreatedItem[] }>(
			await apiB.get('/api/v1/items?limit=100')
		);
		expect(accountBItems.items).toEqual([]);

		const hiddenItem = await apiB.get(`/api/v1/items/${linkId}`);
		expect(hiddenItem.status()).toBe(404);
		expect(await hiddenItem.json()).toMatchObject({
			ok: false,
			error: { code: 'not_found' }
		});

		const foreignCollection = await apiB.post('/api/v1/notes', {
			data: {
				title: 'Cross-account attempt',
				body: 'This must never be created.',
				collectionId
			}
		});
		expect(foreignCollection.status()).toBe(404);
	});

	test('classifies duplicate imports and round trips account backups', async () => {
		const importPayload = {
			idempotencyKey: 'integration-import-2026',
			format: 'whatsapp',
			sourceType: 'whatsapp',
			collectionId,
			tagIds: [tagId],
			ignoredCount: 2,
			candidates: [
				{
					id: 'already-saved',
					originalUrl: 'https://integration.example.test/account-a',
					title: 'Already saved'
				},
				{
					id: 'file-first',
					originalUrl: 'https://duplicates.example.test/shared',
					title: 'First file occurrence'
				},
				{
					id: 'file-repeat',
					originalUrl: 'https://duplicates.example.test/shared',
					title: 'Repeated file occurrence'
				},
				{
					id: 'fresh-link',
					originalUrl: 'https://fresh.example.test/imported',
					title: 'Fresh imported link'
				},
				{
					id: 'privacy-deselected',
					originalUrl: 'https://deselected.example.test/private-path',
					title: 'Must never reach server storage',
					selected: false
				}
			]
		};

		const created = await dataFrom<ImportSnapshot>(
			await apiA.post('/api/v1/imports', { data: importPayload }),
			201
		);
		expect(created.idempotency.replayed).toBe(false);
		expect(created.results.map((result) => result.candidateKey)).not.toContain(
			'privacy-deselected'
		);
		expect(
			Object.fromEntries(created.results.map((result) => [result.candidateKey, result.state]))
		).toMatchObject({
			'already-saved': 'duplicate_account',
			'file-first': 'new',
			'file-repeat': 'duplicate_file',
			'fresh-link': 'new'
		});

		const replay = await dataFrom<ImportSnapshot>(
			await apiA.post('/api/v1/imports', { data: importPayload }),
			201
		);
		expect(replay.id).toBe(created.id);
		expect(replay.idempotency.replayed).toBe(true);

		await dataFrom<ImportSnapshot>(
			await apiA.patch(`/api/v1/imports/${created.id}`, {
				data: { selectedCandidateKeys: ['fresh-link'] }
			})
		);
		const batch = await dataFrom<ImportSnapshot>(
			await apiA.post(`/api/v1/imports/${created.id}/batches`, {
				data: { idempotencyKey: 'integration-batch-2026', batchSize: 10 }
			})
		);
		expect(batch.idempotency.replayed).toBe(false);
		expect(batch.progress.imported).toBe(1);

		const batchReplay = await dataFrom<ImportSnapshot>(
			await apiA.post(`/api/v1/imports/${created.id}/batches`, {
				data: { idempotencyKey: 'integration-batch-2026', batchSize: 10 }
			})
		);
		expect(batchReplay.idempotency.replayed).toBe(true);
		expect(batchReplay.progress.imported).toBe(1);

		const [deselectedStorage] = await queryTestDatabase<{
			import_results: string;
			link_targets: string;
		}>(
			`select
				(select count(*) from import_results
				 where user_id = $1 and original_url like '%deselected.example.test%')::text as import_results,
				(select count(*) from link_targets
				 where user_id = $1 and normalized_url like '%deselected.example.test%')::text as link_targets`,
			[accountA.id]
		);
		expect(deselectedStorage).toEqual({ import_results: '0', link_targets: '0' });

		const jsonExport = await apiA.post('/api/v1/exports', {
			data: { format: 'pasted-json', scope: 'all' }
		});
		expect(jsonExport).toBeOK();
		expect(jsonExport.headers()['content-type']).toContain('application/json');
		const backup = parsePastedBackupJson(await jsonExport.text());
		expect(backup.manifest.itemCount).toBe(4);
		expect(backup.data.items.map((item) => item.type).toSorted()).toEqual([
			'link',
			'link',
			'note',
			'reminder'
		]);
		expect(backup.data.collections.some((entry) => entry.id === collectionId)).toBe(true);
		expect(backup.data.tags.some((entry) => entry.id === tagId)).toBe(true);

		const zipExport = await apiA.post('/api/v1/exports', {
			data: { format: 'zip', scope: 'all' }
		});
		expect(zipExport).toBeOK();
		const downloadedZip = parsePastedBackupZip(new Uint8Array(await zipExport.body()));
		expect(downloadedZip.data).toEqual(backup.data);

		const rebuiltZip = createBackupZip(backup.data, {
			exportedAt: backup.exportedAt,
			...(backup.generator.version ? { generatorVersion: backup.generator.version } : {})
		});
		const roundTripped: PastedBackupV1 = parsePastedBackupZip(rebuiltZip);
		expect(roundTripped.manifest).toEqual(backup.manifest);
		expect(roundTripped.data).toEqual(backup.data);

		const restored = await dataFrom<RestoreSummary>(
			await apiB.post('/api/v1/imports/restore', {
				data: {
					idempotencyKey: 'integration-restore-2026',
					backup: roundTripped
				}
			}),
			201
		);
		expect(restored).toMatchObject({
			collectionsCreated: 1,
			tagsCreated: 1,
			linksCreated: 2,
			notesCreated: 1,
			remindersCreated: 1,
			itemsCreated: 4,
			replayed: false
		});

		const restoredReplay = await dataFrom<RestoreSummary>(
			await apiB.post('/api/v1/imports/restore', {
				data: {
					idempotencyKey: 'integration-restore-2026',
					backup: roundTripped
				}
			}),
			201
		);
		expect(restoredReplay.sessionId).toBe(restored.sessionId);
		expect(restoredReplay.replayed).toBe(true);

		const restoredItems = await dataFrom<{ items: CreatedItem[] }>(
			await apiB.get('/api/v1/items?limit=100')
		);
		expect(restoredItems.items).toHaveLength(4);
		expect(restoredItems.items.map((item) => item.type).toSorted()).toEqual([
			'link',
			'link',
			'note',
			'reminder'
		]);
		const sourceItems = await dataFrom<{ items: CreatedItem[] }>(
			await apiA.get('/api/v1/items?limit=100')
		);
		expect(sourceItems.items).toHaveLength(4);
	});

	test('removes orphan metadata while retaining live shared targets and assets', async () => {
		const sharedUrl = 'https://metadata-privacy.example.test/shared';
		const first = await dataFrom<CreatedItem>(
			await apiA.post('/api/v1/links', {
				data: { originalUrl: sharedUrl, title: 'Shared target first link' }
			}),
			201
		);
		const second = await dataFrom<CreatedItem>(
			await apiA.post('/api/v1/links', {
				data: {
					originalUrl: sharedUrl,
					title: 'Shared target second link',
					allowDuplicate: true
				}
			}),
			201
		);
		const other = await dataFrom<CreatedItem>(
			await apiA.post('/api/v1/links', {
				data: {
					originalUrl: 'https://metadata-privacy.example.test/other',
					title: 'Other target sharing one asset'
				}
			}),
			201
		);
		expect(first.targetId).toBeTruthy();
		expect(second.targetId).toBe(first.targetId);
		expect(other.targetId).toBeTruthy();

		const [uniqueAsset] = await queryTestDatabase<{ id: string }>(
			`insert into media_assets (user_id, kind, sha256, mime_type, bytes, size_bytes)
			 values ($1, 'favicon', $2, 'image/png', $3, $4)
			 returning id`,
			[accountA.id, `unique-${first.id}`, Buffer.from('unique-fake-image'), 17]
		);
		const [sharedAsset] = await queryTestDatabase<{ id: string }>(
			`insert into media_assets (user_id, kind, sha256, mime_type, bytes, size_bytes)
			 values ($1, 'preview', $2, 'image/png', $3, $4)
			 returning id`,
			[accountA.id, `shared-${first.id}`, Buffer.from('shared-fake-image'), 17]
		);
		if (!uniqueAsset || !sharedAsset || !first.targetId || !other.targetId) {
			throw new Error('Metadata privacy test fixtures were not created');
		}
		await queryTestDatabase(
			`update link_targets
			 set favicon_asset_id = $1, preview_asset_id = $2
			 where user_id = $3 and id = $4`,
			[uniqueAsset.id, sharedAsset.id, accountA.id, first.targetId]
		);
		await queryTestDatabase(
			`update link_targets
			 set preview_asset_id = $1
			 where user_id = $2 and id = $3`,
			[sharedAsset.id, accountA.id, other.targetId]
		);

		expect((await apiA.get(`/api/v1/metadata/${first.targetId}`)).status()).toBe(200);
		expect((await apiA.get(`/api/v1/metadata/assets/${uniqueAsset.id}`)).status()).toBe(200);
		expect((await apiA.delete(`/api/v1/links/${first.id}`)).status()).toBe(204);
		expect((await apiA.get(`/api/v1/metadata/${first.targetId}`)).status()).toBe(200);
		expect((await apiA.get(`/api/v1/metadata/assets/${uniqueAsset.id}`)).status()).toBe(200);

		expect((await apiA.delete(`/api/v1/links/${second.id}`)).status()).toBe(204);
		expect((await apiA.get(`/api/v1/metadata/${first.targetId}`)).status()).toBe(404);
		expect((await apiA.get(`/api/v1/metadata/assets/${uniqueAsset.id}`)).status()).toBe(404);
		expect((await apiA.get(`/api/v1/metadata/assets/${sharedAsset.id}`)).status()).toBe(200);

		const [afterLastSharedLink] = await queryTestDatabase<{
			target_exists: boolean;
			unique_asset_exists: boolean;
			shared_asset_exists: boolean;
		}>(
			`select
				exists(select 1 from link_targets where user_id = $1 and id = $2) as target_exists,
				exists(select 1 from media_assets where user_id = $1 and id = $3) as unique_asset_exists,
				exists(select 1 from media_assets where user_id = $1 and id = $4) as shared_asset_exists`,
			[accountA.id, first.targetId, uniqueAsset.id, sharedAsset.id]
		);
		expect(afterLastSharedLink).toEqual({
			target_exists: false,
			unique_asset_exists: false,
			shared_asset_exists: true
		});

		expect((await apiA.delete(`/api/v1/items/${other.id}`)).status()).toBe(204);
		expect((await apiA.get(`/api/v1/metadata/assets/${sharedAsset.id}`)).status()).toBe(404);
	});
});
