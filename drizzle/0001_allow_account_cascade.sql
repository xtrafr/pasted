ALTER TABLE "links" DROP CONSTRAINT "links_import_owner_fk";
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_import_owner_fk" FOREIGN KEY ("user_id","source_import_id") REFERENCES "public"."import_sessions"("user_id","id") ON DELETE no action ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;
