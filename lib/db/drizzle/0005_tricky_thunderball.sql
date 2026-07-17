CREATE TABLE "app_entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"provider" text DEFAULT 'ghl' NOT NULL,
	"external_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_entitlements" ADD CONSTRAINT "app_entitlements_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_entitlements" ADD CONSTRAINT "app_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_entitlements_uniq" ON "app_entitlements" USING btree ("app_id","user_id");--> statement-breakpoint
CREATE INDEX "app_entitlements_external_idx" ON "app_entitlements" USING btree ("external_id");--> statement-breakpoint
ALTER TABLE "app_entitlements" ADD CONSTRAINT "app_entitlements_status_check" CHECK ("status" IN ('pending','active','paused','cancelled'));
