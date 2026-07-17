import { sql } from 'drizzle-orm';
import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

const headers = {
	'cache-control': 'no-store',
	'x-content-type-options': 'nosniff'
};

export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`select 1`);
		return json({ status: 'ok', checks: { database: 'ok' } }, { headers });
	} catch {
		return json(
			{ status: 'unavailable', checks: { database: 'unavailable' } },
			{ status: 503, headers }
		);
	}
};
