CREATE TABLE "app_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_ratings" ADD CONSTRAINT "app_ratings_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_ratings" ADD CONSTRAINT "app_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_ratings_uniq" ON "app_ratings" USING btree ("app_id","user_id");--> statement-breakpoint
CREATE INDEX "app_ratings_app_idx" ON "app_ratings" USING btree ("app_id");--> statement-breakpoint
ALTER TABLE "app_ratings" ADD CONSTRAINT "app_ratings_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
