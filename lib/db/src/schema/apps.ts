import { pgTable, serial, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { appCategoriesTable } from "./app_categories";

export const APP_STAGES = ["submitted", "incubating", "graduated", "retired", "rejected"] as const;
export const APP_ACCESS_TYPES = ["link_out", "provisioned"] as const;

export const appsTable = pgTable(
  "apps",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    // restrict, not cascade: deleting a category must never silently delete its apps.
    categoryId: integer("category_id")
      .notNull()
      .references(() => appCategoriesTable.id, { onDelete: "restrict" }),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    isFirstParty: boolean("is_first_party").notNull().default(false),
    stage: text("stage", { enum: APP_STAGES }).notNull().default("submitted"),
    accessType: text("access_type", { enum: APP_ACCESS_TYPES }).notNull().default("link_out"),
    externalUrl: text("external_url"),
    iconUrl: text("icon_url"),
    screenshots: text("screenshots").array().notNull().default([]),
    graduatedAt: timestamp("graduated_at"),
    graduatedBy: integer("graduated_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("apps_stage_idx").on(t.stage),
    index("apps_category_idx").on(t.categoryId),
    index("apps_owner_idx").on(t.ownerId),
  ],
);

export const insertAppSchema = createInsertSchema(appsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApp = z.infer<typeof insertAppSchema>;
export type App = typeof appsTable.$inferSelect;
export type AppStage = (typeof APP_STAGES)[number];
export type AppAccessType = (typeof APP_ACCESS_TYPES)[number];
