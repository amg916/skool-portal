import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appCategoriesTable = pgTable("app_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppCategorySchema = createInsertSchema(appCategoriesTable).omit({ id: true, createdAt: true });
export type InsertAppCategory = z.infer<typeof insertAppCategorySchema>;
export type AppCategory = typeof appCategoriesTable.$inferSelect;
