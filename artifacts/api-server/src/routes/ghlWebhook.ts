import { Router, type Request } from "express";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, appsTable, usersTable } from "@workspace/db";
import { syncFromProvider } from "../storage/entitlements.js";
import type { EntitlementStatus } from "@workspace/db";

const router = Router();

/**
 * GoHighLevel SaaS Mode webhook.
 *
 * GHL owns the card, the Stripe customer and the billing — it provisions the
 * sub-account when a card succeeds and pauses access when one fails. This
 * endpoint only mirrors that outcome into a thin local entitlement.
 *
 * SECURITY: fail-closed. Without GHL_WEBHOOK_SECRET configured, or with a bad
 * signature, we reject. An unauthenticated endpoint that can grant app access
 * is exactly the thing worth being strict about.
 */
function verify(req: Request, raw: string): boolean {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return false; // not configured -> reject, never accept unsigned
  const sig = String(req.headers["x-ghl-signature"] || req.headers["x-wh-signature"] || "");
  if (!sig) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Map GHL event names onto our small status vocabulary. */
function statusFor(event: string): EntitlementStatus | null {
  const e = event.toLowerCase();
  if (/provision|created|activated|subscription\.active|payment.succeeded/.test(e)) return "active";
  if (/paused|payment.failed|past_due|suspend/.test(e)) return "paused";
  if (/cancel|deleted|churn/.test(e)) return "cancelled";
  return null;
}

router.post("/webhooks/ghl", async (req, res) => {
  const raw = JSON.stringify(req.body ?? {});
  if (!verify(req, raw)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const event = String(body.type || body.event || "");
  const status = statusFor(event);
  if (!status) {
    // Unknown event: acknowledge so GHL stops retrying, but change nothing.
    res.status(202).json({ ok: true, ignored: event });
    return;
  }

  const email = String((body.email as string) || ((body.contact as Record<string, string>)?.email ?? ""));
  const locationId = (body.locationId as string) || (body.location_id as string) || null;
  const appSlug = String(body.appSlug || body.app_slug || "");

  if (!email || !appSlug) {
    res.status(400).json({ error: "Missing email or appSlug" });
    return;
  }

  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  const [app] = await db.select({ id: appsTable.id }).from(appsTable).where(eq(appsTable.slug, appSlug));
  if (!user || !app) {
    res.status(404).json({ error: "Unknown user or app" });
    return;
  }

  await syncFromProvider({ appId: app.id, userId: user.id, externalId: locationId, status });
  res.json({ ok: true, status });
});

export default router;
