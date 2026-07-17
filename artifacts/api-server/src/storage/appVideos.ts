import { eq, and, asc } from "drizzle-orm";
import { db, appVideosTable, recordingsTable, type AppVideoRole } from "@workspace/db";

export type AppVideoView = {
  id: number;
  recordingId: number;
  role: string;
  title: string | null;
  sortOrder: number;
  streamUid: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  transcript: string | null;
};

/**
 * An app's videos, joined to the recordings produced by the existing
 * "Record a banger" pipeline (Cloudflare Stream + Whisper). Nothing new to
 * encode or transcribe — this reuses that pipeline wholesale.
 */
export async function listAppVideos(appId: number): Promise<AppVideoView[]> {
  return db
    .select({
      id: appVideosTable.id,
      recordingId: appVideosTable.recordingId,
      role: appVideosTable.role,
      title: appVideosTable.title,
      sortOrder: appVideosTable.sortOrder,
      streamUid: recordingsTable.streamUid,
      embedUrl: recordingsTable.embedUrl,
      thumbnailUrl: recordingsTable.thumbnailUrl,
      durationSec: recordingsTable.durationSec,
      transcript: recordingsTable.transcript,
    })
    .from(appVideosTable)
    .innerJoin(recordingsTable, eq(appVideosTable.recordingId, recordingsTable.id))
    .where(eq(appVideosTable.appId, appId))
    .orderBy(asc(appVideosTable.sortOrder), asc(appVideosTable.id));
}

export type AttachVideoInput = {
  recordingId: number;
  role?: AppVideoRole;
  title?: string;
  sortOrder?: number;
};

/** Idempotent: re-attaching the same recording updates its role/title/order. */
export async function attachVideo(appId: number, input: AttachVideoInput, actorId: number): Promise<void> {
  await db
    .insert(appVideosTable)
    .values({
      appId,
      recordingId: input.recordingId,
      role: input.role ?? "walkthrough",
      title: input.title ?? null,
      sortOrder: input.sortOrder ?? 0,
      addedBy: actorId,
    })
    .onConflictDoUpdate({
      target: [appVideosTable.appId, appVideosTable.recordingId],
      set: {
        role: input.role ?? "walkthrough",
        title: input.title ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
}

/** Detaches the join only — the recording itself is shared and survives. */
export async function detachVideo(appId: number, videoId: number): Promise<void> {
  await db.delete(appVideosTable).where(and(eq(appVideosTable.appId, appId), eq(appVideosTable.id, videoId)));
}
