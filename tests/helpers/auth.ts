import {
	expect,
	request as playwrightRequest,
	type APIRequestContext,
	type Page
} from '@playwright/test';

import type { TestAccount } from './database';

export async function signInRequest(
	baseURL: string,
	account: TestAccount
): Promise<APIRequestContext> {
	const context = await playwrightRequest.newContext({ baseURL });
	const response = await context.post('/api/v1/access/login', {
		data: {
			accessCode: account.accessCode
		}
	});
	expect(response, `Sign in failed for fake account ${account.id}`).toBeOK();
	return context;
}

export async function signInPage(page: Page, account: TestAccount): Promise<void> {
	await page.goto('/login');
	await page.getByLabel('Access code').fill(account.accessCode);
	await page.getByRole('button', { name: 'Log in', exact: true }).click();
	await expect(page).toHaveURL(/\/app(?:\?|$)/);
	await expect(page.getByRole('heading', { name: 'Everything' })).toBeVisible();
}
