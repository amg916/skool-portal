import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const chatsTable = pgTable(
  "chats",
  {
    id: serial("id").primaryKey(),
    userAId: integer("user_a_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userBId: integer("user_b_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqPair: uniqueIndex("chats_pair_uniq").on(t.userAId, t.userBId),
  }),
);

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chatsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Chat = typeof chatsTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
