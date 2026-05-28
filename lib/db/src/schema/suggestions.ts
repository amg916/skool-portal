import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["open", "planned", "done", "rejected"] }).notNull().default("open"),
  authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const suggestionVotesTable = pgTable(
  "suggestion_votes",
  {
    id: serial("id").primaryKey(),
    suggestionId: integer("suggestion_id").notNull().references(() => suggestionsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ uniq: uniqueIndex("suggestion_votes_uniq").on(t.suggestionId, t.userId) }),
);

export type Suggestion = typeof suggestionsTable.$inferSelect;
export type SuggestionVote = typeof suggestionVotesTable.$inferSelect;
