CREATE TABLE "app_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"category_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"is_first_party" boolean DEFAULT false NOT NULL,
	"stage" text DEFAULT 'submitted' NOT NULL,
	"access_type" text DEFAULT 'link_out' NOT NULL,
	"external_url" text,
	"icon_url" text,
	"screenshots" text[] DEFAULT '{}' NOT NULL,
	"graduated_at" timestamp,
	"graduated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_category_id_app_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."app_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_graduated_by_users_id_fk" FOREIGN KEY ("graduated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_modules" ADD CONSTRAINT "app_modules_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apps_stage_idx" ON "apps" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "apps_category_idx" ON "apps" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "apps_owner_idx" ON "apps" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "app_modules_app_idx" ON "app_modules" USING btree ("app_id");--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_stage_check" CHECK ("stage" IN ('submitted','incubating','graduated','retired','rejected'));--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_access_type_check" CHECK ("access_type" IN ('link_out','provisioned'));
