CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."collection_sort" AS ENUM('manual', 'created_at', 'title');--> statement-breakpoint
CREATE TYPE "public"."export_state" AS ENUM('pending', 'building', 'ready', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."import_format" AS ENUM('text', 'whatsapp', 'json', 'pasted_json', 'csv', 'markdown', 'html', 'netscape_bookmarks');--> statement-breakpoint
CREATE TYPE "public"."import_result_state" AS ENUM('new', 'duplicate_file', 'duplicate_account', 'invalid', 'imported', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."import_state" AS ENUM('analyzing', 'reviewing', 'importing', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."item_state" AS ENUM('active', 'read', 'broken');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('link', 'note', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('favicon', 'preview');--> statement-breakpoint
CREATE TYPE "public"."metadata_state" AS ENUM('pending', 'fetching', 'ready', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."reminder_state" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"sort_mode" "collection_sort" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"state" "export_state" DEFAULT 'pending' NOT NULL,
	"format" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"estimated_bytes" integer,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"import_session_id" uuid NOT NULL,
	"item_id" uuid,
	"candidate_key" text NOT NULL,
	"original_url" text NOT NULL,
	"normalized_url" text,
	"masked_source" text,
	"source_date" timestamp with time zone,
	"state" "import_result_state" NOT NULL,
	"selected" boolean DEFAULT true NOT NULL,
	"secret_kinds" text[] DEFAULT '{}'::text[] NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"format" "import_format" NOT NULL,
	"state" "import_state" DEFAULT 'analyzing' NOT NULL,
	"source_label" text,
	"file_name" text,
	"idempotency_key" text NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"valid_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"ignored_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "item_tags" (
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_tags_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "item_type" NOT NULL,
	"title" text,
	"description" text,
	"collection_id" uuid,
	"state" "item_state" DEFAULT 'active' NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"search_document" "tsvector",
	"source_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"normalized_url" text NOT NULL,
	"domain" text NOT NULL,
	"metadata_title" text,
	"metadata_description" text,
	"site_name" text,
	"favicon_asset_id" uuid,
	"preview_asset_id" uuid,
	"metadata_state" "metadata_state" DEFAULT 'pending' NOT NULL,
	"metadata_error_code" text,
	"http_status" integer,
	"last_fetched_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"item_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_id" uuid NOT NULL,
	"original_url" text NOT NULL,
	"personal_notes" text,
	"imported_title" text,
	"source_type" text,
	"source_import_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"sha256" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"item_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"item_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone NOT NULL,
	"state" "reminder_state" DEFAULT 'pending' NOT NULL,
	"recurrence" text,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"completed_at" timestamp with time zone,
	"last_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid,
	"collection_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shares_single_target_check" CHECK (num_nonnulls("shares"."item_id", "shares"."collection_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_heartbeats" (
	"worker_id" text PRIMARY KEY NOT NULL,
	"process_type" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_results" ADD CONSTRAINT "import_results_session_owner_fk" FOREIGN KEY ("user_id","import_session_id") REFERENCES "public"."import_sessions"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_results" ADD CONSTRAINT "import_results_item_owner_fk" FOREIGN KEY ("user_id","item_id") REFERENCES "public"."items"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_item_owner_fk" FOREIGN KEY ("user_id","item_id") REFERENCES "public"."items"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_tag_owner_fk" FOREIGN KEY ("user_id","tag_id") REFERENCES "public"."tags"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_collection_owner_fk" FOREIGN KEY ("user_id","collection_id") REFERENCES "public"."collections"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_targets" ADD CONSTRAINT "link_targets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_targets" ADD CONSTRAINT "link_targets_favicon_owner_fk" FOREIGN KEY ("user_id","favicon_asset_id") REFERENCES "public"."media_assets"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_targets" ADD CONSTRAINT "link_targets_preview_owner_fk" FOREIGN KEY ("user_id","preview_asset_id") REFERENCES "public"."media_assets"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_item_owner_fk" FOREIGN KEY ("user_id","item_id") REFERENCES "public"."items"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_target_owner_fk" FOREIGN KEY ("user_id","target_id") REFERENCES "public"."link_targets"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_import_owner_fk" FOREIGN KEY ("user_id","source_import_id") REFERENCES "public"."import_sessions"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_item_owner_fk" FOREIGN KEY ("user_id","item_id") REFERENCES "public"."items"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_item_owner_fk" FOREIGN KEY ("user_id","item_id") REFERENCES "public"."items"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_item_owner_fk" FOREIGN KEY ("user_id","item_id") REFERENCES "public"."items"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_collection_owner_fk" FOREIGN KEY ("user_id","collection_id") REFERENCES "public"."collections"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_tokens_hash_uidx" ON "api_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "api_tokens_user_idx" ON "api_tokens" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_user_name_uidx" ON "collections" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_user_id_uidx" ON "collections" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "collections_user_sort_idx" ON "collections" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "export_jobs_user_created_idx" ON "export_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "import_results_session_candidate_uidx" ON "import_results" USING btree ("import_session_id","candidate_key");--> statement-breakpoint
CREATE INDEX "import_results_session_state_idx" ON "import_results" USING btree ("import_session_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "import_sessions_user_key_uidx" ON "import_sessions" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "import_sessions_user_id_uidx" ON "import_sessions" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "import_sessions_user_created_idx" ON "import_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "item_tags_user_tag_idx" ON "item_tags" USING btree ("user_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "items_user_id_uidx" ON "items" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "items_user_created_idx" ON "items" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "items_user_type_idx" ON "items" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "items_user_collection_idx" ON "items" USING btree ("user_id","collection_id");--> statement-breakpoint
CREATE INDEX "items_user_favorite_idx" ON "items" USING btree ("user_id","favorite");--> statement-breakpoint
CREATE INDEX "items_user_archived_idx" ON "items" USING btree ("user_id","archived");--> statement-breakpoint
CREATE INDEX "items_search_idx" ON "items" USING gin ("search_document");--> statement-breakpoint
CREATE UNIQUE INDEX "link_targets_user_url_uidx" ON "link_targets" USING btree ("user_id","normalized_url");--> statement-breakpoint
CREATE UNIQUE INDEX "link_targets_user_id_uidx" ON "link_targets" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "link_targets_user_domain_idx" ON "link_targets" USING btree ("user_id","domain");--> statement-breakpoint
CREATE INDEX "link_targets_metadata_state_idx" ON "link_targets" USING btree ("metadata_state","next_retry_at");--> statement-breakpoint
CREATE INDEX "links_user_target_idx" ON "links" USING btree ("user_id","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_user_hash_uidx" ON "media_assets" USING btree ("user_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_user_id_uidx" ON "media_assets" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "media_assets_user_created_idx" ON "media_assets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reminders_user_due_idx" ON "reminders" USING btree ("user_id","state","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shares_token_hash_uidx" ON "shares" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "shares_user_idx" ON "shares" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_uidx" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_uidx" ON "tags" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "tags_user_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_uidx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_key_uidx" ON "rate_limit" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_uidx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_uidx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_idx" ON "verification" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "items_title_trgm_idx" ON "items" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "link_targets_url_trgm_idx" ON "link_targets" USING gin ("normalized_url" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "link_targets_domain_trgm_idx" ON "link_targets" USING gin ("domain" gin_trgm_ops);
