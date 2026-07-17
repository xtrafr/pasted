import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { inspectTestDatabase, queryTestDatabase } from '../helpers/database';

const database = await inspectTestDatabase();
const displayName = `Access UI ${randomUUID()}`;

test.describe('access-code account UI', () => {
	test.skip(!database.available, database.reason);

	let userId = '';

	test.afterAll(async () => {
		await queryTestDatabase('delete from "user" where id = $1 or name = $2', [userId, displayName]);
	});

	test('registers, saves the one-time code, signs out, and logs back in', async ({
		page,
		context
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
			origin: 'http://127.0.0.1:4173'
		});

		await page.goto('/register');
		await page.getByLabel('Display name (optional)').fill(displayName);
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByRole('heading', { name: 'Save your access code.' })).toBeVisible();
		await expect(page.getByText('There is no recovery process.')).toBeVisible();
		const accessCode = (await page.locator('.code-box code').textContent())?.trim() ?? '';
		expect(accessCode).toMatch(/^[A-Za-z0-9]{32}$/);
		expect(accessCode).toMatch(/[A-Za-z]/);
		expect(accessCode).toMatch(/[0-9]/);

		const [storedUser] = await queryTestDatabase<{ id: string }>(
			'select id from "user" where name = $1',
			[displayName]
		);
		userId = storedUser?.id ?? '';
		expect(userId).not.toBe('');
		const libraryResponse = await page.request.get('/api/v1/items?limit=1');
		expect(libraryResponse).toBeOK();
		expect((await page.request.get('/api/auth/get-session')).status()).toBe(404);

		await page.getByRole('button', { name: 'Copy code' }).click();
		await expect(page.getByText('Access code copied.')).toBeVisible();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(accessCode);

		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Download code' }).click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe('pasted-access-code.txt');
		const downloadPath = await download.path();
		expect(downloadPath).not.toBeNull();
		expect(await readFile(downloadPath!, 'utf8')).toContain(accessCode);

		await page.getByRole('button', { name: 'Continue to library' }).click();
		await expect(page).toHaveURL(/\/app(?:\?|$)/);
		await expect(page.getByText(displayName)).toBeVisible();
		await expect(page.getByText(/@accounts\.pasted\.invalid/)).toHaveCount(0);

		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL(/\/$/);
		await page.goto('/login');
		await page.getByLabel('Access code').fill(accessCode);
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		await expect(page).toHaveURL(/\/app(?:\?|$)/);
		await expect(page.getByRole('heading', { name: 'Everything' })).toBeVisible();

		await page.getByRole('button', { name: 'Sign out' }).click();
		await page.goto('/register');
		await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
		await expect(page.locator('.code-box')).toHaveCount(0);
	});
});
