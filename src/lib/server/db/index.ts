import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const client = postgres(env.DATABASE_URL ?? 'postgres://pasted:pasted@127.0.0.1:5432/pasted', {
	max: 10,
	connect_timeout: 10,
	idle_timeout: 20
});

export const db = drizzle(client, { schema });
