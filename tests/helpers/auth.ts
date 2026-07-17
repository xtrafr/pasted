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
	const response = await context.post('/api/auth/sign-in/email', {
		data: {
			email: account.email,
			password: account.password,
			rememberMe: false
		}
	});
	expect(response, `Sign in failed for fake account ${account.email}`).toBeOK();
	return context;
}

export async function signInPage(page: Page, account: TestAccount): Promise<void> {
	await page.goto('/login');
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await expect(page).toHaveURL(/\/app(?:\?|$)/);
	await expect(page.getByRole('heading', { name: 'Everything' })).toBeVisible();
}
