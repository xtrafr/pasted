import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '$lib/server/db/schema';
import { jobLogger } from './log';

const localDatabaseUrl = 'postgres://pasted:pasted@127.0.0.1:5432/pasted';

export const workerDatabasePool = new Pool({
	connectionString: process.env.DATABASE_URL ?? localDatabaseUrl,
	max: 6,
	connectionTimeoutMillis: 5_000,
	idleTimeoutMillis: 20_000,
	allowExitOnIdle: true,
	application_name: 'pasted-metadata-worker'
});

workerDatabasePool.on('error', (error) => {
	jobLogger.error({ message: error.message }, 'Metadata worker database pool error');
});

export const workerDb = drizzle(workerDatabasePool, { schema });

export async function closeWorkerDatabase(): Promise<void> {
	await workerDatabasePool.end();
}
