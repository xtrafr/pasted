import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
const demoEmail = (process.env.DEMO_USER_EMAIL ?? 'demo@example.com').trim().toLowerCase();
const demoPassword = process.env.DEMO_USER_PASSWORD ?? 'demo-password-change-me';

if (!databaseUrl) {
	throw new Error('DATABASE_URL is required to seed the database');
}

if (demoPassword.length < 12) {
	throw new Error('DEMO_USER_PASSWORD must contain at least 12 characters');
}

const ids = {
	user: 'demo_user_pasted',
	account: 'demo_account_pasted',
	collections: {
		inspiration: '10000000-0000-4000-8000-000000000001',
		reading: '10000000-0000-4000-8000-000000000002'
	},
	tags: {
		design: '20000000-0000-4000-8000-000000000001',
		useful: '20000000-0000-4000-8000-000000000002'
	},
	items: {
		guide: '30000000-0000-4000-8000-000000000001',
		reference: '30000000-0000-4000-8000-000000000002',
		note: '30000000-0000-4000-8000-000000000003',
		reminder: '30000000-0000-4000-8000-000000000004'
	},
	targets: {
		guide: '40000000-0000-4000-8000-000000000001',
		reference: '40000000-0000-4000-8000-000000000002'
	}
} as const;

const client = new Client({ connectionString: databaseUrl });
let transactionStarted = false;

try {
	await client.connect();
	await client.query('begin');
	transactionStarted = true;

	const passwordHash = await hashPassword(demoPassword);
	const reminderDueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1_000);

	await client.query(
		`insert into "user" (id, name, email, email_verified)
		 values ($1, $2, $3, true)
		 on conflict (id) do update
		 set name = excluded.name, email = excluded.email, updated_at = now()`,
		[ids.user, 'Demo Curator', demoEmail]
	);

	await client.query(
		`insert into account (id, account_id, provider_id, user_id, password)
		 values ($1, $2, 'credential', $2, $3)
		 on conflict (id) do update
		 set password = excluded.password, updated_at = now()`,
		[ids.account, ids.user, passwordHash]
	);

	await client.query(
		`insert into collections (id, user_id, name, description, color, icon, sort_order)
		 values
			($1, $3, 'Inspiration', 'Visual references worth keeping', '#ff6b35', 'sparkles', 0),
			($2, $3, 'Reading list', 'Long reads for a quiet afternoon', '#4b7bec', 'book-open', 1)
		 on conflict (id) do update
		 set name = excluded.name, description = excluded.description,
			 color = excluded.color, icon = excluded.icon, updated_at = now()`,
		[ids.collections.inspiration, ids.collections.reading, ids.user]
	);

	await client.query(
		`insert into tags (id, user_id, name, color)
		 values
			($1, $3, 'design', '#ff6b35'),
			($2, $3, 'useful', '#28a745')
		 on conflict (id) do update
		 set name = excluded.name, color = excluded.color, updated_at = now()`,
		[ids.tags.design, ids.tags.useful, ids.user]
	);

	await client.query(
		`insert into link_targets
			(id, user_id, normalized_url, domain, metadata_title, metadata_description, site_name, metadata_state)
		 values
			($1, $3, 'https://example.com/field-guide', 'example.com', 'A small field guide', 'Fake example content for the demo library.', 'Example', 'ready'),
			($2, $3, 'https://example.org/reference', 'example.org', 'Reference notebook', 'Another safe, fictional link used by the seed.', 'Example', 'ready')
		 on conflict (id) do update
		 set metadata_title = excluded.metadata_title,
			 metadata_description = excluded.metadata_description,
			 site_name = excluded.site_name,
			 metadata_state = excluded.metadata_state,
			 updated_at = now()`,
		[ids.targets.guide, ids.targets.reference, ids.user]
	);

	await client.query(
		`insert into items
			(id, user_id, type, title, description, collection_id, favorite, sort_order)
		 values
			($1, $5, 'link', 'A small field guide', 'A fictional reference saved for later.', $6, true, 0),
			($2, $5, 'link', 'Reference notebook', 'A safe example link with no tracking.', $7, false, 1),
			($3, $5, 'note', 'Ideas for the weekend', 'Plan a screen-free afternoon and bring a notebook.', $6, false, 2),
			($4, $5, 'reminder', 'Review saved reading', 'Pick one article and write down three useful ideas.', $7, false, 3)
		 on conflict (id) do update
		 set title = excluded.title, description = excluded.description,
			 collection_id = excluded.collection_id, favorite = excluded.favorite,
			 sort_order = excluded.sort_order, updated_at = now()`,
		[
			ids.items.guide,
			ids.items.reference,
			ids.items.note,
			ids.items.reminder,
			ids.user,
			ids.collections.inspiration,
			ids.collections.reading
		]
	);

	await client.query(
		`insert into links (item_id, user_id, target_id, original_url, personal_notes, source_type)
		 values
			($1, $5, $3, 'https://example.com/field-guide', 'Look at the layout rhythm.', 'seed'),
			($2, $5, $4, 'https://example.org/reference', 'Read the overview first.', 'seed')
		 on conflict (item_id) do update
		 set target_id = excluded.target_id, original_url = excluded.original_url,
			 personal_notes = excluded.personal_notes, updated_at = now()`,
		[ids.items.guide, ids.items.reference, ids.targets.guide, ids.targets.reference, ids.user]
	);

	await client.query(
		`insert into notes (item_id, user_id, body)
		 values ($1, $2, 'Plan a screen-free afternoon and bring a notebook.')
		 on conflict (item_id) do update set body = excluded.body, updated_at = now()`,
		[ids.items.note, ids.user]
	);

	await client.query(
		`insert into reminders (item_id, user_id, description, due_at, time_zone)
		 values ($1, $2, 'Pick one article and write down three useful ideas.', $3, 'Europe/Madrid')
		 on conflict (item_id) do update
		 set description = excluded.description, due_at = excluded.due_at,
			 time_zone = excluded.time_zone, state = 'pending', completed_at = null,
			 updated_at = now()`,
		[ids.items.reminder, ids.user, reminderDueAt]
	);

	await client.query(
		`insert into item_tags (user_id, item_id, tag_id)
		 values
			($1, $2, $4),
			($1, $3, $5),
			($1, $6, $5)
		 on conflict (item_id, tag_id) do nothing`,
		[
			ids.user,
			ids.items.guide,
			ids.items.reference,
			ids.tags.design,
			ids.tags.useful,
			ids.items.note
		]
	);

	await client.query(
		`update items
		 set search_document = to_tsvector('simple', concat_ws(' ', title, description))
		 where user_id = $1`,
		[ids.user]
	);

	await client.query('commit');
	transactionStarted = false;
	console.log(`Seeded fake demo data for ${demoEmail}`);
	console.log('Change the demo password immediately outside local evaluation environments.');
} catch (error) {
	if (transactionStarted) await client.query('rollback').catch(() => undefined);
	throw error;
} finally {
	await client.end();
}
