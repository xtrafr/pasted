import { expect, request as playwrightRequest, test } from '@playwright/test';
import {
	inspectTestDatabase,
	queryTestDatabase,
	testAccessCodeLookupHash
} from '../helpers/database';

interface ApiEnvelope<T> {
	ok: boolean;
	data: T;
}

interface StoredCredential {
	user_id: string;
	email: string;
	name: string;
	lookup_hash: string;
	password: string;
	last_used_at: Date | null;
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const database = await inspectTestDatabase();

test.describe('access-code account authentication', () => {
	test.describe.configure({ mode: 'serial' });
	test.skip(!database.available, database.reason);

	let userId = '';
	let accessCode = '';
	let syntheticEmail = '';

	test.afterAll(async () => {
		if (userId) {
			await queryTestDatabase('delete from "user" where id = $1', [userId]);
		}
	});

	test('registers, returns plaintext once, and stores only secure credential forms', async () => {
		const browser = await playwrightRequest.newContext({ baseURL });
		try {
			const response = await browser.post('/api/v1/access/register', {
				data: { displayName: 'Access Code Integration' }
			});
			expect(response.status()).toBe(201);
			const payload = (await response.json()) as ApiEnvelope<{ accessCode: string }>;
			expect(payload.ok).toBe(true);
			expect(Object.keys(payload.data)).toEqual(['accessCode']);
			accessCode = payload.data.accessCode;
			expect(accessCode).toMatch(/^[A-Za-z0-9]{32}$/);
			expect(accessCode).toMatch(/[A-Za-z]/);
			expect(accessCode).toMatch(/[0-9]/);

			const lookupHash = testAccessCodeLookupHash(accessCode);
			const [stored] = await queryTestDatabase<StoredCredential>(
				`select ac.user_id, u.email, u.name, ac.lookup_hash, a.password, ac.last_used_at
				 from access_credential ac
				 join "user" u on u.id = ac.user_id
				 join account a on a.user_id = u.id and a.provider_id = 'credential'
				 where ac.lookup_hash = $1`,
				[lookupHash]
			);
			expect(stored).toBeDefined();
			userId = stored!.user_id;
			syntheticEmail = stored!.email;
			expect(stored).toMatchObject({
				name: 'Access Code Integration',
				lookup_hash: lookupHash,
				last_used_at: null
			});
			expect(syntheticEmail).toMatch(/^access\.[a-f0-9]{32}@accounts\.pasted\.invalid$/);
			expect(JSON.stringify(stored)).not.toContain(accessCode);
			expect(stored!.password).not.toBe(accessCode);

			const items = await browser.get('/api/v1/items?limit=1');
			expect(items.status()).toBe(200);
			const app = await browser.get('/app');
			expect(app.status()).toBe(200);
			expect(await app.text()).not.toContain(syntheticEmail);
			const session = await browser.get('/api/auth/get-session');
			expect(session.status()).toBe(404);
		} finally {
			await browser.dispose();
		}
	});

	test('logs in from normalized input without returning the code again', async () => {
		const browser = await playwrightRequest.newContext({ baseURL });
		try {
			const wrong = await browser.post('/api/v1/access/login', {
				data: { accessCode: 'Z1234567890123456789012345678909' }
			});
			expect(wrong.status()).toBe(401);
			expect(await wrong.json()).toMatchObject({
				ok: false,
				error: { code: 'unauthorized' }
			});

			const response = await browser.post('/api/v1/access/login', {
				data: { accessCode: `\r\n ${accessCode}\t` }
			});
			expect(response.status()).toBe(200);
			const payload = (await response.json()) as ApiEnvelope<{ authenticated: true }>;
			expect(payload).toEqual({ ok: true, data: { authenticated: true } });
			expect(JSON.stringify(payload)).not.toContain(accessCode);

			const [stored] = await queryTestDatabase<{ last_used_at: Date | null }>(
				'select last_used_at from access_credential where user_id = $1',
				[userId]
			);
			expect(stored?.last_used_at).toBeInstanceOf(Date);
		} finally {
			await browser.dispose();
		}
	});

	test('blocks every alternate public Better Auth credential route', async () => {
		const browser = await playwrightRequest.newContext({ baseURL });
		try {
			const attempts = [
				browser.post('/api/auth/sign-in/email', {
					data: { email: syntheticEmail, password: accessCode }
				}),
				browser.post('/api/auth/sign-up/email', {
					data: { name: 'Bypass', email: 'bypass@example.test', password: accessCode }
				}),
				browser.post('/api/auth/sign-in/social', {
					data: { provider: 'github', callbackURL: '/app' }
				}),
				browser.post('/api/auth/request-password-reset', {
					data: { email: syntheticEmail }
				}),
				browser.post('/api/auth/change-password', {
					data: { currentPassword: accessCode, newPassword: accessCode }
				})
			];

			for (const attempt of attempts) {
				expect((await attempt).status()).toBe(404);
			}
		} finally {
			await browser.dispose();
		}
	});

	test('cascades credential and Better Auth state when the owner is deleted', async () => {
		await queryTestDatabase('delete from "user" where id = $1', [userId]);
		const [remaining] = await queryTestDatabase<{
			credentials: string;
			accounts: string;
			sessions: string;
		}>(
			`select
				(select count(*) from access_credential where user_id = $1)::text as credentials,
				(select count(*) from account where user_id = $1)::text as accounts,
				(select count(*) from session where user_id = $1)::text as sessions`,
			[userId]
		);
		expect(remaining).toEqual({ credentials: '0', accounts: '0', sessions: '0' });
		userId = '';
	});
});
