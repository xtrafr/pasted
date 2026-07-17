import { expect, test } from '@playwright/test';

import { signInPage } from '../helpers/auth';
import {
	inspectTestDatabase,
	removeTestAccounts,
	seedTestAccount,
	type TestAccount
} from '../helpers/database';

const database = await inspectTestDatabase();
const account: TestAccount = {
	id: 'pw_browser_mobile_flow',
	name: 'Mobile Flow Curator',
	email: 'pw-mobile-flow@example.test',
	password: 'fake-mobile-password-2026'
};

test.describe('mobile navigation', () => {
	test.skip(!database.available, database.reason);

	test.beforeAll(async () => {
		await seedTestAccount(account);
	});

	test.afterAll(async () => {
		await removeTestAccounts([account]);
	});

	test('keeps landing and dashboard controls usable on a phone viewport', async ({ page }) => {
		await page.goto('/');
		await expect(
			page.getByRole('heading', { name: /Save it now\. Find it later\./i })
		).toBeVisible();
		const landingWidth = await page.evaluate(() => ({
			document: document.documentElement.scrollWidth,
			viewport: document.documentElement.clientWidth
		}));
		expect(landingWidth.document).toBeLessThanOrEqual(landingWidth.viewport + 1);

		await signInPage(page, account);
		await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
		await page.getByRole('button', { name: 'Open navigation' }).click();
		const navigation = page.getByRole('complementary', { name: 'Library navigation' });
		await expect(navigation).toBeVisible();
		await expect(navigation.getByRole('link', { name: 'Import' })).toBeVisible();
		await expect(navigation.getByRole('link', { name: 'Export' })).toBeVisible();
		await navigation.getByRole('button', { name: 'Close navigation' }).click();
		await expect(navigation).not.toBeInViewport();

		await page.getByRole('button', { name: /Quick add/ }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Save something' })).toBeVisible();
		await expect(dialog.getByRole('tab', { name: 'link' })).toBeVisible();
		await expect(dialog.getByRole('tab', { name: 'note' })).toBeVisible();
		await expect(dialog.getByRole('tab', { name: 'reminder' })).toBeVisible();
		await dialog.getByRole('button', { name: 'Close dialog' }).click();

		const dashboardWidth = await page.evaluate(() => ({
			document: document.documentElement.scrollWidth,
			viewport: document.documentElement.clientWidth
		}));
		expect(dashboardWidth.document).toBeLessThanOrEqual(dashboardWidth.viewport + 1);
	});
});
