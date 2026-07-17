CREATE TABLE "access_credential" (
	"user_id" text PRIMARY KEY NOT NULL,
	"lookup_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "access_credential" ADD CONSTRAINT "access_credential_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_credential_lookup_hash_uidx" ON "access_credential" USING btree ("lookup_hash");