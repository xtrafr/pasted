import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { signInPage } from '../helpers/auth';
import {
	inspectTestDatabase,
	removeTestAccounts,
	seedTestAccount,
	type TestAccount
} from '../helpers/database';

const database = await inspectTestDatabase();
const fakeWhatsAppPath = fileURLToPath(
	new URL('../fixtures/import/fake-whatsapp.txt', import.meta.url)
);
const account: TestAccount = {
	id: 'pw_browser_library_flow',
	name: 'Browser Flow Curator',
	email: 'pw-browser-flow@example.test',
	password: 'fake-browser-password-2026'
};

test.describe('complete browser library flow', () => {
	test.describe.configure({ mode: 'serial' });
	test.skip(!database.available, database.reason);

	test.beforeAll(async () => {
		await seedTestAccount(account);
	});

	test.afterAll(async () => {
		await removeTestAccounts([account]);
	});

	test('imports, organizes, finds, exports, and schedules fake content', async ({ page }) => {
		test.slow();
		await page.emulateMedia({ reducedMotion: 'reduce' });

		await test.step('visit the public landing page with reduced motion', async () => {
			await page.goto('/');
			await expect(
				page.getByRole('heading', { name: /Save it now\. Find it later\./i })
			).toBeVisible();
			await expect(page.getByRole('link', { name: 'Start your library' }).first()).toBeVisible();
			const motion = await page
				.locator('.reveal')
				.first()
				.evaluate((element) => {
					const style = getComputedStyle(element);
					const duration = style.transitionDuration.split(',')[0]?.trim() ?? '0s';
					const durationMs = duration.endsWith('ms')
						? Number.parseFloat(duration)
						: Number.parseFloat(duration) * 1_000;
					return {
						reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
						durationMs,
						transform: style.transform
					};
				});
			expect(motion.reduced).toBe(true);
			expect(motion.durationMs).toBeLessThanOrEqual(0.02);
			expect(motion.transform).toBe('none');
		});

		await test.step('sign in with a seeded fake account', async () => {
			await signInPage(page, account);
		});

		await test.step('import selected links from the public fake WhatsApp fixture', async () => {
			await page.goto('/app/import');
			await expect(
				page.getByRole('heading', { name: 'Leave the clutter. Keep the links.' })
			).toBeVisible();
			await page.locator('input[type="file"]').setInputFiles(fakeWhatsAppPath);
			await expect(page.getByText('fake-whatsapp.txt')).toBeVisible();
			await page.getByRole('button', { name: 'Find the useful parts' }).click();
			await expect(page.getByRole('heading', { name: /This looks like WhatsApp/i })).toBeVisible();
			await page.getByRole('button', { name: /Review \d+ links/ }).click();
			await expect(page.getByRole('heading', { name: 'Choose what stays.' })).toBeVisible();

			await page.getByRole('button', { name: 'Deselect all' }).click();
			await expect(page.locator('.selection-total strong')).toHaveText('0');
			await page.getByRole('button', { name: 'Only new' }).click();
			await expect(page.locator('.selection-total strong')).not.toHaveText('0');
			const deselectedRow = page.locator('.result-row').filter({ hasText: 'two.example' });
			const deselectedUrl = (await deselectedRow.locator('.display-url').textContent())?.trim();
			expect(deselectedUrl).toBeTruthy();
			await deselectedRow.getByRole('checkbox').uncheck();
			await page.getByPlaceholder('Search results').fill('example');
			await expect(page.getByText(/example\.(com|org|net)/i).first()).toBeVisible();
			await page.getByPlaceholder('Search results').fill('');

			await page.getByRole('button', { name: '+ Create a collection' }).click();
			const collectionDialog = page.getByRole('dialog');
			await expect(
				collectionDialog.getByRole('heading', { name: 'Create a collection' })
			).toBeVisible();
			await collectionDialog.getByLabel('Name').fill('Imported research');
			await collectionDialog.getByLabel('Description').fill('A fully fake browser test collection');
			await collectionDialog.getByRole('button', { name: 'Create and select' }).click();
			await expect(collectionDialog).not.toBeVisible();
			await expect(page.locator('.import-options select')).toHaveValue(/[0-9a-f-]{36}/i);

			const createRequest = page.waitForRequest(
				(request) =>
					request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/imports'
			);
			const batchResponse = page.waitForResponse(
				(response) =>
					response.request().method() === 'POST' &&
					/\/api\/v1\/imports\/[^/]+\/batches$/.test(response.url())
			);
			await page.getByRole('button', { name: /Import \d+ links/ }).click();
			const createPayload = (await createRequest).postDataJSON() as {
				candidates: Array<{ originalUrl: string }>;
			};
			expect(createPayload.candidates.map((candidate) => candidate.originalUrl)).not.toContain(
				deselectedUrl
			);
			expect((await batchResponse).ok()).toBe(true);
			await expect(page.getByRole('heading', { name: 'Back where they belong.' })).toBeVisible({
				timeout: 20_000
			});
			await page.getByRole('link', { name: 'View imported links' }).click();
			await expect(page).toHaveURL(/\/app\?sourceImport=/);
		});

		await test.step('search and filter the imported collection', async () => {
			const search = page.getByPlaceholder('Search everything');
			await search.fill('example');
			await expect(page).toHaveURL(/q=example/, { timeout: 10_000 });
			await expect(page.getByText(/example\.(com|org)/i).first()).toBeVisible();

			await page.getByLabel('Filter by type').selectOption('link');
			await expect(page).toHaveURL(/type=link/);
			await page.getByLabel('Filter by collection').selectOption({ label: 'Imported research' });
			await expect(page.getByRole('heading', { name: 'Imported research' })).toBeVisible();
			await expect(page.locator('.item-card--link').first()).toBeVisible();
		});

		await test.step('download and validate a portable export', async () => {
			await page.goto('/app/export');
			await expect(page.getByRole('heading', { name: 'Your library has an exit.' })).toBeVisible();
			const downloadPromise = page.waitForEvent('download');
			await page.getByRole('button', { name: 'Download .pasted.json' }).click();
			const download = await downloadPromise;
			expect(download.suggestedFilename()).toMatch(/\.pasted\.json$/);
			const downloadedPath = await download.path();
			expect(downloadedPath).not.toBeNull();
			const backup = JSON.parse(await readFile(downloadedPath!, 'utf8')) as {
				format: string;
				manifest: { itemCount: number };
			};
			expect(backup.format).toBe('pasted-backup');
			expect(backup.manifest.itemCount).toBeGreaterThan(0);
		});

		await test.step('create a reminder and use dashboard keyboard commands', async () => {
			await page.goto('/app');
			await page.keyboard.press('n');
			const quickAdd = page.getByRole('dialog');
			await expect(quickAdd.getByRole('heading', { name: 'Save something' })).toBeVisible();
			await quickAdd.getByRole('tab', { name: 'reminder' }).click();
			await quickAdd.getByLabel('What should you remember?').fill('Review imported research');
			await quickAdd.getByLabel('Details').fill('Check the fully fake imported links');
			await quickAdd.getByLabel('Date and time').fill('2027-02-03T10:30');
			await quickAdd.getByLabel('Collection').selectOption({ label: 'Imported research' });
			await quickAdd.getByRole('button', { name: 'Save reminder' }).click();
			await expect(page.getByRole('heading', { name: 'Review imported research' })).toBeVisible();

			await page.keyboard.press('ControlOrMeta+k');
			await expect(page.getByRole('heading', { name: 'Go somewhere' })).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(page.getByRole('heading', { name: 'Go somewhere' })).not.toBeVisible();
			await page.keyboard.press('/');
			await expect(page.getByPlaceholder('Search everything')).toBeFocused();
		});
	});
});
