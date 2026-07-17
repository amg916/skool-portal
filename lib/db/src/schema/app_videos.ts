import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";
import { recordingsTable } from "./recordings";
import { usersTable } from "./users";

export const APP_VIDEO_ROLES = ["walkthrough", "demo", "changelog"] as const;

/**
 * Joins an app to a recording from the existing "Record a banger" pipeline
 * (Cloudflare Stream + Whisper transcript). One recording can appear on more
 * than one app, and an app has an ordered list of videos — hence a join table
 * rather than a column on either side.
 */
export const appVideosTable = pgTable(
  "app_videos",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    recordingId: integer("recording_id")
      .notNull()
      .references(() => recordingsTable.id, { onDelete: "cascade" }),
    role: text("role", { enum: APP_VIDEO_ROLES }).notNull().default("walkthrough"),
    title: text("title"),
    sortOrder: integer("sort_order").notNull().default(0),
    addedBy: integer("added_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("app_videos_uniq").on(t.appId, t.recordingId),
    index("app_videos_app_idx").on(t.appId),
  ],
);

export const insertAppVideoSchema = createInsertSchema(appVideosTable).omit({ id: true, createdAt: true });
export type InsertAppVideo = z.infer<typeof insertAppVideoSchema>;
export type AppVideo = typeof appVideosTable.$inferSelect;
export type AppVideoRole = (typeof APP_VIDEO_ROLES)[number];
