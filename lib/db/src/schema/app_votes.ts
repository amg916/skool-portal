import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";
import { usersTable } from "./users";

export const appVotesTable = pgTable(
  "app_votes",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("app_votes_uniq").on(t.appId, t.userId)],
);

export const insertAppVoteSchema = createInsertSchema(appVotesTable).omit({ id: true, createdAt: true });
export type InsertAppVote = z.infer<typeof insertAppVoteSchema>;
export type AppVote = typeof appVotesTable.$inferSelect;
