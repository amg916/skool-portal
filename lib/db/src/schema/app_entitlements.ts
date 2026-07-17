import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";
import { usersTable } from "./users";

export const ENTITLEMENT_STATUSES = ["pending", "active", "paused", "cancelled"] as const;

/**
 * A user's access to a `provisioned` app (today: GoHighLevel SaaS Mode).
 *
 * DELIBERATELY THIN. Baingers stores a foreign key and a status — nothing else.
 * The card, the Stripe customer, the billing and the risk all live on GHL's
 * side: the user enters their card on GHL's surface, into GHL's Stripe Connect,
 * and GHL provisions the sub-account on success / pauses on failure. A card form
 * here would drag the community server into PCI DSS scope for no benefit.
 *
 * `external_id` = the GHL location (sub-account) id. Kept in sync by GHL webhooks.
 */
export const appEntitlementsTable = pgTable(
  "app_entitlements",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("ghl"),
    externalId: text("external_id"), // GHL location/sub-account id
    status: text("status", { enum: ENTITLEMENT_STATUSES }).notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("app_entitlements_uniq").on(t.appId, t.userId),
    index("app_entitlements_external_idx").on(t.externalId),
  ],
);

export const insertAppEntitlementSchema = createInsertSchema(appEntitlementsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAppEntitlement = z.infer<typeof insertAppEntitlementSchema>;
export type AppEntitlement = typeof appEntitlementsTable.$inferSelect;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];
