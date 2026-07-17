import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";
import { usersTable } from "./users";

/**
 * A rating answers "is this app any good?" — catalog-only, 1–5 plus optional
 * review text. Deliberately NOT the same as an app_vote, which answers "should
 * this graduate?" (incubator-only, binary). Merging them would let a popular
 * incubator app arrive in the catalog with a star history it never earned.
 */
export const appRatingsTable = pgTable(
  "app_ratings",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    review: text("review"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("app_ratings_uniq").on(t.appId, t.userId),
    index("app_ratings_app_idx").on(t.appId),
  ],
);

export const insertAppRatingSchema = createInsertSchema(appRatingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAppRating = z.infer<typeof insertAppRatingSchema>;
export type AppRating = typeof appRatingsTable.$inferSelect;
