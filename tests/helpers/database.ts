import { createHash } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import pg, { type QueryResultRow } from 'pg';
import { hashAccessCode } from '../../src/lib/server/access-auth/access-code';

const { Client } = pg;

export const testDatabaseUrl =
	process.env.TEST_DATABASE_URL ??
	process.env.DATABASE_URL ??
	'postgres://pasted:pasted@127.0.0.1:5432/pasted';

export interface DatabaseStatus {
	available: boolean;
	reason: string;
}

export interface TestAccount {
	id: string;
	name: string;
	accessCode: string;
}

export function testAccessCodeLookupHash(accessCode: string): string {
	return hashAccessCode(accessCode);
}

export function testAccountEmail(account: Pick<TestAccount, 'id'>): string {
	const opaqueId = createHash('sha256').update(`pasted-test-account\0${account.id}`).digest('hex');
	return `access.${opaqueId.slice(0, 32)}@accounts.pasted.invalid`;
}

export async function inspectTestDatabase(): Promise<DatabaseStatus> {
	const client = new Client({
		connectionString: testDatabaseUrl,
		connectionTimeoutMillis: 1_250
	});

	try {
		await client.connect();
		const result = await client.query<{
			user_table: string | null;
			items_table: string | null;
			access_credential_table: string | null;
		}>(
			`select to_regclass('public.user')::text as user_table,
			        to_regclass('public.items')::text as items_table,
			        to_regclass('public.access_credential')::text as access_credential_table`
		);
		if (
			!result.rows[0]?.user_table ||
			!result.rows[0]?.items_table ||
			!result.rows[0]?.access_credential_table
		) {
			return {
				available: false,
				reason:
					'PostgreSQL is reachable but the Pasted schema is missing. Run pnpm db:migrate first.'
			};
		}
		return { available: true, reason: '' };
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return {
			available: false,
			reason: `PostgreSQL integration tests skipped because the test database is unavailable: ${detail}`
		};
	} finally {
		await client.end().catch(() => undefined);
	}
}

export async function seedTestAccount(account: TestAccount): Promise<void> {
	if (
		!/^[A-Za-z0-9]{32}$/.test(account.accessCode) ||
		!/[A-Za-z]/.test(account.accessCode) ||
		!/[0-9]/.test(account.accessCode)
	) {
		throw new Error('Test account access codes must be 32 mixed alphanumeric characters');
	}

	const client = new Client({ connectionString: testDatabaseUrl });
	await client.connect();
	try {
		await client.query('begin');
		const email = testAccountEmail(account);
		await client.query('delete from "user" where id = $1 or email = $2', [account.id, email]);
		const passwordHash = await hashPassword(account.accessCode);
		const lookupHash = testAccessCodeLookupHash(account.accessCode);
		await client.query(
			`insert into "user" (id, name, email, email_verified)
			 values ($1, $2, $3, true)`,
			[account.id, account.name, email]
		);
		await client.query(
			`insert into account (id, account_id, provider_id, user_id, password)
			 values ($1, $2, 'credential', $2, $3)`,
			[`credential_${account.id}`, account.id, passwordHash]
		);
		await client.query(
			`insert into access_credential (user_id, lookup_hash)
			 values ($1, $2)`,
			[account.id, lookupHash]
		);
		await client.query('commit');
	} catch (error) {
		await client.query('rollback').catch(() => undefined);
		throw error;
	} finally {
		await client.end();
	}
}

export async function removeTestAccounts(accounts: readonly TestAccount[]): Promise<void> {
	if (accounts.length === 0) return;
	const client = new Client({ connectionString: testDatabaseUrl });
	await client.connect();
	try {
		await client.query('delete from "user" where id = any($1::text[])', [
			accounts.map((account) => account.id)
		]);
	} finally {
		await client.end();
	}
}

export async function queryTestDatabase<Row extends QueryResultRow>(
	text: string,
	values: readonly unknown[] = []
): Promise<Row[]> {
	const client = new Client({ connectionString: testDatabaseUrl });
	await client.connect();
	try {
		const result = await client.query<Row>(text, [...values]);
		return result.rows;
	} finally {
		await client.end();
	}
}
