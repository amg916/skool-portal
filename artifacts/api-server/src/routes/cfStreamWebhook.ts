import { Router, type IRouter } from "express";
import express from "express";
import { eq } from "drizzle-orm";
import { db, recordingsTable } from "@workspace/db";
import {
  verifyStreamWebhook,
  streamEmbedUrl,
  streamMp4Url,
} from "../lib/cfStream.js";
import { kickTranscriptionAsync } from "../jobs/transcribe.js";

const router: IRouter = Router();

/**
 * POST /api/webhooks/cloudflare-stream
 *
 * CF Stream calls this on every state transition (ready, error).
 * Verifies HMAC signature, updates the recordings row, and kicks the
 * Whisper transcription job for newly-ready videos.
 *
 * NOTE: this endpoint mounts express.raw() ahead of express.json() so we
 * have access to the raw body for HMAC verification. The router is wired
 * BEFORE the global json parser in routes/index.ts.
 */
router.post(
  "/webhooks/cloudflare-stream",
  express.raw({ type: "*/*", limit: "256kb" }),
  async (req, res) => {
    const rawBody = (req.body as Buffer)?.toString("utf8") ?? "";
    const sig = req.header("Webhook-Signature");

    const valid = await verifyStreamWebhook(rawBody, sig);
    if (!valid) {
      console.warn("[cfStreamWebhook] invalid signature; sig=", sig);
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    let payload: {
      uid?: string;
      status?: { state?: string; errorReasonText?: string };
      duration?: number;
      thumbnail?: string;
      playback?: { hls?: string; dash?: string };
      readyToStream?: boolean;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    const uid = payload.uid;
    const state = payload.status?.state;
    if (!uid) {
      res.status(400).json({ error: "Missing uid" });
      return;
    }

    const existing = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.streamUid, uid))
      .limit(1);

    if (!existing[0]) {
      console.warn("[cfStreamWebhook] no recording row for uid", uid);
      // Still 200 — CF retries 4xx aggressively and we don't want to spam.
      res.json({ ok: true, skipped: "unknown_uid" });
      return;
    }

    const updates: Partial<typeof existing[0]> = {};
    if (state === "ready" || payload.readyToStream) {
      updates.status = "ready";
      updates.hlsUrl = payload.playback?.hls ?? null;
      updates.durationSec = payload.duration
        ? Math.round(payload.duration)
        : null;
      updates.thumbnailUrl = payload.thumbnail ?? null;
      updates.embedUrl = streamEmbedUrl(uid);
      updates.mp4Url = streamMp4Url(uid);
      updates.readyAt = new Date();
    } else if (state === "error") {
      updates.status = "error";
      updates.errorMessage =
        payload.status?.errorReasonText ?? "Unknown CF error";
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(recordingsTable)
        .set(updates)
        .where(eq(recordingsTable.streamUid, uid));
    }

    // Kick transcription job (fire-and-forget) only on first ready transition.
    if (
      (state === "ready" || payload.readyToStream) &&
      existing[0].status !== "ready" &&
      !existing[0].transcript
    ) {
      kickTranscriptionAsync(existing[0].id).catch((err) =>
        console.error("[cfStreamWebhook] transcribe kick failed", err),
      );
    }

    res.json({ ok: true });
  },
);

export default router;
