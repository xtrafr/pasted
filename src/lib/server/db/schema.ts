import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	customType,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType() {
		return 'bytea';
	}
});

const tsvector = customType<{ data: string }>({
	dataType() {
		return 'tsvector';
	}
});

export const itemType = pgEnum('item_type', ['link', 'note', 'reminder']);
export const itemState = pgEnum('item_state', ['active', 'read', 'broken']);
export const reminderState = pgEnum('reminder_state', ['pending', 'completed']);
export const collectionSort = pgEnum('collection_sort', ['manual', 'created_at', 'title']);
export const metadataState = pgEnum('metadata_state', [
	'pending',
	'fetching',
	'ready',
	'failed',
	'blocked'
]);
export const mediaKind = pgEnum('media_kind', ['favicon', 'preview']);
export const importFormat = pgEnum('import_format', [
	'text',
	'whatsapp',
	'json',
	'pasted_json',
	'csv',
	'markdown',
	'html',
	'netscape_bookmarks'
]);
export const importState = pgEnum('import_state', [
	'analyzing',
	'reviewing',
	'importing',
	'completed',
	'cancelled',
	'failed'
]);
export const importResultState = pgEnum('import_result_state', [
	'new',
	'duplicate_file',
	'duplicate_account',
	'invalid',
	'imported',
	'failed',
	'skipped'
]);
export const exportState = pgEnum('export_state', [
	'pending',
	'building',
	'ready',
	'failed',
	'cancelled'
]);

export const collections = pgTable(
	'collections',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		color: text('color'),
		icon: text('icon'),
		sortOrder: integer('sort_order').default(0).notNull(),
		sortMode: collectionSort('sort_mode').default('manual').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('collections_user_name_uidx').on(table.userId, table.name),
		uniqueIndex('collections_user_id_uidx').on(table.userId, table.id),
		index('collections_user_sort_idx').on(table.userId, table.sortOrder)
	]
);

export const tags = pgTable(
	'tags',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('tags_user_name_uidx').on(table.userId, table.name),
		uniqueIndex('tags_user_id_uidx').on(table.userId, table.id),
		index('tags_user_idx').on(table.userId)
	]
);

export const importSessions = pgTable(
	'import_sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		format: importFormat('format').notNull(),
		state: importState('state').default('analyzing').notNull(),
		sourceLabel: text('source_label'),
		fileName: text('file_name'),
		idempotencyKey: text('idempotency_key').notNull(),
		options: jsonb('options').$type<Record<string, unknown>>().default({}).notNull(),
		totalCount: integer('total_count').default(0).notNull(),
		validCount: integer('valid_count').default(0).notNull(),
		duplicateCount: integer('duplicate_count').default(0).notNull(),
		ignoredCount: integer('ignored_count').default(0).notNull(),
		errorCount: integer('error_count').default(0).notNull(),
		importedCount: integer('imported_count').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true })
	},
	(table) => [
		uniqueIndex('import_sessions_user_key_uidx').on(table.userId, table.idempotencyKey),
		uniqueIndex('import_sessions_user_id_uidx').on(table.userId, table.id),
		index('import_sessions_user_created_idx').on(table.userId, table.createdAt)
	]
);

export const items = pgTable(
	'items',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: itemType('type').notNull(),
		title: text('title'),
		description: text('description'),
		collectionId: uuid('collection_id'),
		state: itemState('state').default('active').notNull(),
		favorite: boolean('favorite').default(false).notNull(),
		archived: boolean('archived').default(false).notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		searchDocument: tsvector('search_document'),
		sourceDate: timestamp('source_date', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('items_user_id_uidx').on(table.userId, table.id),
		index('items_user_created_idx').on(table.userId, table.createdAt),
		index('items_user_type_idx').on(table.userId, table.type),
		index('items_user_collection_idx').on(table.userId, table.collectionId),
		index('items_user_favorite_idx').on(table.userId, table.favorite),
		index('items_user_archived_idx').on(table.userId, table.archived),
		index('items_search_idx').using('gin', table.searchDocument),
		foreignKey({
			columns: [table.userId, table.collectionId],
			foreignColumns: [collections.userId, collections.id],
			name: 'items_collection_owner_fk'
		}).onDelete('restrict')
	]
);

export const mediaAssets = pgTable(
	'media_assets',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		kind: mediaKind('kind').notNull(),
		sha256: text('sha256').notNull(),
		mimeType: text('mime_type').notNull(),
		bytes: bytea('bytes').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('media_assets_user_hash_uidx').on(table.userId, table.sha256),
		uniqueIndex('media_assets_user_id_uidx').on(table.userId, table.id),
		index('media_assets_user_created_idx').on(table.userId, table.createdAt)
	]
);

export const linkTargets = pgTable(
	'link_targets',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		normalizedUrl: text('normalized_url').notNull(),
		domain: text('domain').notNull(),
		metadataTitle: text('metadata_title'),
		metadataDescription: text('metadata_description'),
		siteName: text('site_name'),
		faviconAssetId: uuid('favicon_asset_id'),
		previewAssetId: uuid('preview_asset_id'),
		metadataState: metadataState('metadata_state').default('pending').notNull(),
		metadataErrorCode: text('metadata_error_code'),
		httpStatus: integer('http_status'),
		lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
		nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('link_targets_user_url_uidx').on(table.userId, table.normalizedUrl),
		uniqueIndex('link_targets_user_id_uidx').on(table.userId, table.id),
		index('link_targets_user_domain_idx').on(table.userId, table.domain),
		index('link_targets_metadata_state_idx').on(table.metadataState, table.nextRetryAt),
		foreignKey({
			columns: [table.userId, table.faviconAssetId],
			foreignColumns: [mediaAssets.userId, mediaAssets.id],
			name: 'link_targets_favicon_owner_fk'
		}).onDelete('restrict'),
		foreignKey({
			columns: [table.userId, table.previewAssetId],
			foreignColumns: [mediaAssets.userId, mediaAssets.id],
			name: 'link_targets_preview_owner_fk'
		}).onDelete('restrict')
	]
);

export const links = pgTable(
	'links',
	{
		itemId: uuid('item_id').primaryKey(),
		userId: text('user_id').notNull(),
		targetId: uuid('target_id').notNull(),
		originalUrl: text('original_url').notNull(),
		personalNotes: text('personal_notes'),
		importedTitle: text('imported_title'),
		sourceType: text('source_type'),
		sourceImportId: uuid('source_import_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('links_user_target_idx').on(table.userId, table.targetId),
		foreignKey({
			columns: [table.userId, table.itemId],
			foreignColumns: [items.userId, items.id],
			name: 'links_item_owner_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.userId, table.targetId],
			foreignColumns: [linkTargets.userId, linkTargets.id],
			name: 'links_target_owner_fk'
		}).onDelete('restrict'),
		foreignKey({
			columns: [table.userId, table.sourceImportId],
			foreignColumns: [importSessions.userId, importSessions.id],
			name: 'links_import_owner_fk'
		}).onDelete('restrict')
	]
);

export const notes = pgTable(
	'notes',
	{
		itemId: uuid('item_id').primaryKey(),
		userId: text('user_id').notNull(),
		body: text('body').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.userId, table.itemId],
			foreignColumns: [items.userId, items.id],
			name: 'notes_item_owner_fk'
		}).onDelete('cascade')
	]
);

export const reminders = pgTable(
	'reminders',
	{
		itemId: uuid('item_id').primaryKey(),
		userId: text('user_id').notNull(),
		description: text('description'),
		dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
		state: reminderState('state').default('pending').notNull(),
		recurrence: text('recurrence'),
		timeZone: text('time_zone').default('UTC').notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('reminders_user_due_idx').on(table.userId, table.state, table.dueAt),
		foreignKey({
			columns: [table.userId, table.itemId],
			foreignColumns: [items.userId, items.id],
			name: 'reminders_item_owner_fk'
		}).onDelete('cascade')
	]
);

export const itemTags = pgTable(
	'item_tags',
	{
		userId: text('user_id').notNull(),
		itemId: uuid('item_id').notNull(),
		tagId: uuid('tag_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		primaryKey({ columns: [table.itemId, table.tagId] }),
		index('item_tags_user_tag_idx').on(table.userId, table.tagId),
		foreignKey({
			columns: [table.userId, table.itemId],
			foreignColumns: [items.userId, items.id],
			name: 'item_tags_item_owner_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.userId, table.tagId],
			foreignColumns: [tags.userId, tags.id],
			name: 'item_tags_tag_owner_fk'
		}).onDelete('cascade')
	]
);

export const importResults = pgTable(
	'import_results',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id').notNull(),
		importSessionId: uuid('import_session_id').notNull(),
		itemId: uuid('item_id'),
		candidateKey: text('candidate_key').notNull(),
		originalUrl: text('original_url').notNull(),
		normalizedUrl: text('normalized_url'),
		maskedSource: text('masked_source'),
		sourceDate: timestamp('source_date', { withTimezone: true }),
		state: importResultState('state').notNull(),
		selected: boolean('selected').default(true).notNull(),
		secretKinds: text('secret_kinds')
			.array()
			.default(sql`'{}'::text[]`)
			.notNull(),
		errorCode: text('error_code'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('import_results_session_candidate_uidx').on(
			table.importSessionId,
			table.candidateKey
		),
		index('import_results_session_state_idx').on(table.importSessionId, table.state),
		foreignKey({
			columns: [table.userId, table.importSessionId],
			foreignColumns: [importSessions.userId, importSessions.id],
			name: 'import_results_session_owner_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.userId, table.itemId],
			foreignColumns: [items.userId, items.id],
			name: 'import_results_item_owner_fk'
		}).onDelete('cascade')
	]
);

export const shares = pgTable(
	'shares',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		itemId: uuid('item_id'),
		collectionId: uuid('collection_id'),
		tokenHash: text('token_hash').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('shares_token_hash_uidx').on(table.tokenHash),
		index('shares_user_idx').on(table.userId, table.createdAt),
		check(
			'shares_single_target_check',
			sql`num_nonnulls(${table.itemId}, ${table.collectionId}) = 1`
		),
		foreignKey({
			columns: [table.userId, table.itemId],
			foreignColumns: [items.userId, items.id],
			name: 'shares_item_owner_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.userId, table.collectionId],
			foreignColumns: [collections.userId, collections.id],
			name: 'shares_collection_owner_fk'
		}).onDelete('cascade')
	]
);

export const apiTokens = pgTable(
	'api_tokens',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		prefix: text('prefix').notNull(),
		tokenHash: text('token_hash').notNull(),
		scopes: text('scopes')
			.array()
			.default(sql`'{}'::text[]`)
			.notNull(),
		lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('api_tokens_hash_uidx').on(table.tokenHash),
		index('api_tokens_user_idx').on(table.userId, table.createdAt)
	]
);

export const exportJobs = pgTable(
	'export_jobs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		state: exportState('state').default('pending').notNull(),
		format: text('format').notNull(),
		filters: jsonb('filters').$type<Record<string, unknown>>().default({}).notNull(),
		itemCount: integer('item_count').default(0).notNull(),
		estimatedBytes: integer('estimated_bytes'),
		failureCode: text('failure_code'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true })
	},
	(table) => [index('export_jobs_user_created_idx').on(table.userId, table.createdAt)]
);

export const workerHeartbeats = pgTable('worker_heartbeats', {
	workerId: text('worker_id').primaryKey(),
	processType: text('process_type').notNull(),
	startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
	lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
	metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull()
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type Tag = typeof tags.$inferSelect;
