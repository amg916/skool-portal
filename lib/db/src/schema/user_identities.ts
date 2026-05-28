import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userIdentitiesTable = pgTable(
  "user_identities",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["email", "google", "facebook", "github"] }).notNull(),
    providerUserId: text("provider_user_id").notNull(),
    providerEmail: text("provider_email"),
    providerData: text("provider_data"),
    lastSignInAt: timestamp("last_sign_in_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqProviderUser: uniqueIndex("user_identities_provider_uniq").on(
      t.provider,
      t.providerUserId,
    ),
  }),
);

export type UserIdentity = typeof userIdentitiesTable.$inferSelect;
