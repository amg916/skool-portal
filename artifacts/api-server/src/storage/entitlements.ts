import { eq, and } from "drizzle-orm";
import { db, appEntitlementsTable, type AppEntitlement, type EntitlementStatus } from "@workspace/db";

/**
 * Entitlements for `provisioned` apps (today: GoHighLevel SaaS Mode).
 *
 * Baingers never sees a card. The user enters payment on GHL's own surface,
 * into GHL's Stripe Connect; GHL provisions the sub-account and tells us the
 * outcome by webhook. We persist a foreign key (the GHL location id) and a
 * status — nothing more. That keeps this server entirely out of PCI scope.
 */
export async function getEntitlement(appId: number, userId: number): Promise<AppEntitlement | null> {
  const [row] = await db
    .select()
    .from(appEntitlementsTable)
    .where(and(eq(appEntitlementsTable.appId, appId), eq(appEntitlementsTable.userId, userId)));
  return row ?? null;
}

/**
 * Record intent to provision. Idempotent. Status starts `pending` — it only
 * becomes `active` when GHL confirms the sub-account exists (card accepted).
 */
export async function startEntitlement(appId: number, userId: number): Promise<AppEntitlement> {
  await db
    .insert(appEntitlementsTable)
    .values({ appId, userId, provider: "ghl", status: "pending" })
    .onConflictDoNothing({ target: [appEntitlementsTable.appId, appEntitlementsTable.userId] });
  const e = await getEntitlement(appId, userId);
  if (!e) throw new Error("failed to start entitlement");
  return e;
}

/**
 * Apply provider truth (a verified GHL webhook). Upserts, because GHL may
 * provision out of band — it, not us, is the source of truth for status.
 */
export async function syncFromProvider(input: {
  appId: number;
  userId: number;
  externalId?: string | null;
  status: EntitlementStatus;
}): Promise<AppEntitlement | null> {
  await db
    .insert(appEntitlementsTable)
    .values({
      appId: input.appId,
      userId: input.userId,
      provider: "ghl",
      externalId: input.externalId ?? null,
      status: input.status,
    })
    .onConflictDoUpdate({
      target: [appEntitlementsTable.appId, appEntitlementsTable.userId],
      set: { externalId: input.externalId ?? null, status: input.status, updatedAt: new Date() },
    });
  return getEntitlement(input.appId, input.userId);
}
