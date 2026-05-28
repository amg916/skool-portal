import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const groupSettingsTable = pgTable("group_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  bannerUrl: text("banner_url"),
  iconUrl: text("icon_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GroupSettings = typeof groupSettingsTable.$inferSelect;
