CREATE TABLE "app_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"recording_id" integer NOT NULL,
	"role" text DEFAULT 'walkthrough' NOT NULL,
	"title" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"added_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "app_id" integer;--> statement-breakpoint
ALTER TABLE "app_videos" ADD CONSTRAINT "app_videos_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_videos" ADD CONSTRAINT "app_videos_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_videos" ADD CONSTRAINT "app_videos_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_videos_uniq" ON "app_videos" USING btree ("app_id","recording_id");--> statement-breakpoint
CREATE INDEX "app_videos_app_idx" ON "app_videos" USING btree ("app_id");