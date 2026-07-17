import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { runtimeConfig } from '$lib/server/config';

export const databasePool = new Pool({
	connectionString: runtimeConfig.databaseUrl,
	max: runtimeConfig.databasePoolSize,
	connectionTimeoutMillis: 5_000,
	idleTimeoutMillis: 20_000,
	allowExitOnIdle: true
});

databasePool.on('error', (error) => {
	console.error('PostgreSQL pool error', { message: error.message });
});

export const db = drizzle(databasePool, { schema });

export async function checkDatabase(): Promise<boolean> {
	const client = await databasePool.connect();
	try {
		await client.query('select 1');
		return true;
	} finally {
		client.release();
	}
}

export async function closeDatabase(): Promise<void> {
	await databasePool.end();
}
