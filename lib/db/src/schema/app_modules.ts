import { pgTable, serial, text, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";

export const appModulesTable = pgTable(
  "app_modules",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("app_modules_app_idx").on(t.appId)],
);

export const insertAppModuleSchema = createInsertSchema(appModulesTable).omit({ id: true });
export type InsertAppModule = z.infer<typeof insertAppModuleSchema>;
export type AppModule = typeof appModulesTable.$inferSelect;
