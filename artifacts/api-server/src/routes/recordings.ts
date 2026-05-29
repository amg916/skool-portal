import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, recordingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import {
  createDirectUpload,
  getStreamVideo,
  streamEmbedUrl,
  streamMp4Url,
} from "../lib/cfStream.js";

const router: IRouter = Router();

/**
 * POST /api/recordings/upload-url
 *
 * Returns a CF Stream direct-creator-upload URL the browser will POST the
 * recorded blob to (single multipart/form-data POST with a `file` field).
 * Also creates a recordings row in `pending` status so we can correlate.
 *
 * Body: { maxDurationSeconds?: number }
 *
 * Response: { uploadUrl, streamUid, recordingId, embedUrl }
 */
router.post("/recordings/upload-url", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const maxSec = Math.max(
    30,
    Math.min(
      900, // 15 min hard cap to prevent runaway storage
      Number(req.body?.maxDurationSeconds) || 600, // default 10 min (brand cap)
    ),
  );

  try {
    const { uploadUrl, uid } = await createDirectUpload({
      maxDurationSeconds: maxSec,
      creatorId: String(userId),
      meta: { name: `banger-${userId}-${Date.now()}` },
    });

    const inserted = await db
      .insert(recordingsTable)
      .values({
        userId,
        streamUid: uid,
        status: "pending",
        embedUrl: streamEmbedUrl(uid),
        mp4Url: streamMp4Url(uid),
      })
      .returning();

    res.json({
      uploadUrl,
      streamUid: uid,
      recordingId: inserted[0]!.id,
      embedUrl: streamEmbedUrl(uid),
    });
  } catch (err) {
    console.error("[recordings/upload-url]", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "CF Stream error",
    });
  }
});

/**
 * POST /api/recordings/:streamUid/finalize
 *
 * Client calls this after the upload completes. We poll CF Stream once to
 * update the row (the webhook will fire later with the final ready state).
 */
router.post("/recordings/:streamUid/finalize", requireAuth, async (req, res) => {
  const uid = String(req.params.streamUid || "");
  if (!uid) {
    res.status(400).json({ error: "Missing streamUid" });
    return;
  }

  const existing = await db
    .select()
    .from(recordingsTable)
    .where(eq(recordingsTable.streamUid, uid))
    .limit(1);

  if (!existing[0]) {
    res.status(404).json({ error: "Recording not found" });
    return;
  }
  if (existing[0].userId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const cf = await getStreamVideo(uid);
    const state = cf.status?.state;
    const updates: Partial<typeof existing[0]> = {};
    if (state === "ready") {
      updates.status = "ready";
      updates.hlsUrl = cf.playback?.hls ?? null;
      updates.durationSec = cf.duration ? Math.round(cf.duration) : null;
      updates.thumbnailUrl = cf.thumbnail ?? null;
      updates.readyAt = new Date();
    } else if (state === "error") {
      updates.status = "error";
      updates.errorMessage = cf.status?.errorReasonText ?? "Unknown CF error";
    } else if (existing[0].status === "pending") {
      updates.status = "uploaded";
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(recordingsTable)
        .set(updates)
        .where(eq(recordingsTable.streamUid, uid));
    }

    const fresh = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.streamUid, uid))
      .limit(1);

    res.json(fresh[0]);
  } catch (err) {
    console.error("[recordings/finalize]", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "CF Stream error",
    });
  }
});

/**
 * GET /api/recordings/:streamUid
 *
 * Light polling endpoint the client can hit while waiting for CF to encode.
 */
router.get("/recordings/:streamUid", requireAuth, async (req, res) => {
  const uid = String(req.params.streamUid || "");
  const rows = await db
    .select()
    .from(recordingsTable)
    .where(eq(recordingsTable.streamUid, uid))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (rows[0].userId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(rows[0]);
});

export default router;
