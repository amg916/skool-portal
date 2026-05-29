import { eq } from "drizzle-orm";
import { db, recordingsTable } from "@workspace/db";
import {
  provisionMp4Download,
  streamMp4Url,
  waitForMp4Ready,
} from "../lib/cfStream.js";

/**
 * Whisper transcription pipeline for a finished CF Stream recording.
 *
 * Flow:
 *   1. Fetch the CF Stream MP4 download (audio + video — OpenAI handles both).
 *   2. POST multipart/form-data to OpenAI's transcription endpoint
 *      (model: whisper-1, response_format: text — keeps it simple + cheap).
 *   3. Save transcript onto the recording row.
 *   4. Best-effort: generate a 6-word title hint + comma-separated tag hints
 *      via the Anthropic API for nicer post defaults.
 *
 * NEVER throws — failures are logged + the row gets `errorMessage` populated.
 * The webhook handler kicks this fire-and-forget; we own all error handling.
 */
export async function kickTranscriptionAsync(recordingId: number): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.id, recordingId))
      .limit(1);
    const rec = rows[0];
    if (!rec) {
      console.warn("[transcribe] recording", recordingId, "missing");
      return;
    }
    if (rec.transcript) {
      console.log("[transcribe] already transcribed", recordingId);
      return;
    }

    const openaiKey = process.env["OPENAI_API_KEY"];
    if (!openaiKey) {
      console.warn("[transcribe] OPENAI_API_KEY unset; skipping");
      return;
    }

    // CF doesn't auto-provision MP4 downloads — only HLS. Request one
    // explicitly, then poll until it's ready (typically <90s for short clips).
    console.log("[transcribe] provisioning MP4", rec.streamUid);
    try {
      await provisionMp4Download(rec.streamUid);
    } catch (err) {
      console.error("[transcribe] provision failed", err);
      await db
        .update(recordingsTable)
        .set({
          errorMessage: `Transcription unavailable: provision failed (${
            err instanceof Error ? err.message : String(err)
          })`,
        })
        .where(eq(recordingsTable.id, recordingId));
      return;
    }

    let mp4Url: string;
    try {
      const ready = await waitForMp4Ready(rec.streamUid, {
        timeoutMs: 180_000,
      });
      mp4Url = ready.url || streamMp4Url(rec.streamUid);
      console.log("[transcribe] MP4 ready", rec.streamUid);
    } catch (err) {
      console.error("[transcribe] MP4 poll failed", err);
      await db
        .update(recordingsTable)
        .set({
          errorMessage: "Transcription unavailable: MP4 not ready after 3 min",
        })
        .where(eq(recordingsTable.id, recordingId));
      return;
    }

    const r0 = await fetch(mp4Url);
    if (!r0.ok) {
      console.error("[transcribe] MP4 fetch HTTP", r0.status, "for", mp4Url);
      await db
        .update(recordingsTable)
        .set({
          errorMessage: `Transcription unavailable: MP4 fetch HTTP ${r0.status}`,
        })
        .where(eq(recordingsTable.id, recordingId));
      return;
    }
    const ab = await r0.arrayBuffer();
    const audioBuf = Buffer.from(ab);
    console.log("[transcribe] MP4 fetched", audioBuf.length, "bytes");

    // POST to OpenAI Whisper.
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(audioBuf)], { type: "video/mp4" }),
      `banger-${rec.streamUid}.mp4`,
    );
    form.append("model", "whisper-1");
    form.append("response_format", "text");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!r.ok) {
      const text = await r.text();
      console.error("[transcribe] OpenAI error", r.status, text.slice(0, 400));
      await db
        .update(recordingsTable)
        .set({
          errorMessage: `Transcription failed: OpenAI ${r.status}`,
        })
        .where(eq(recordingsTable.id, recordingId));
      return;
    }
    const transcript = (await r.text()).trim();

    // Auto-extract a title hint (first sentence, max 80 chars).
    const firstSentence = transcript.split(/[.!?]\s+/, 1)[0]?.trim() ?? "";
    const titleHint = firstSentence.slice(0, 80);

    // Best-effort tag extraction via Claude. Fail soft.
    let tagsHint: string | null = null;
    try {
      tagsHint = await suggestTagsViaClaude(transcript);
    } catch (err) {
      console.warn("[transcribe] tag suggestion failed", err);
    }

    await db
      .update(recordingsTable)
      .set({
        transcript,
        titleHint: titleHint || null,
        tagsHint,
        transcribedAt: new Date(),
      })
      .where(eq(recordingsTable.id, recordingId));

    console.log(
      "[transcribe] done",
      recordingId,
      `(${transcript.length} chars, tags: ${tagsHint ?? "—"})`,
    );
  } catch (err) {
    console.error("[transcribe] fatal", err);
    await db
      .update(recordingsTable)
      .set({
        errorMessage: `Transcription crash: ${
          err instanceof Error ? err.message : String(err)
        }`,
      })
      .where(eq(recordingsTable.id, recordingId))
      .catch(() => {});
  }
}

async function suggestTagsViaClaude(transcript: string): Promise<string | null> {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) return null;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-7-20250929",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content:
            "Pick 1-3 short lowercase tags for this AI-builder video transcript. " +
            "Examples of valid tags: agents, rag, claude, voice, prompts, tools. " +
            "Return ONLY a comma-separated list, no prose, no quotes.\n\nTranscript:\n" +
            transcript.slice(0, 4000),
        },
      ],
    }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { content?: Array<{ text?: string }> };
  const text = j.content?.[0]?.text?.trim();
  if (!text) return null;
  // Sanitize — keep only alnum, dash, comma, space.
  return text
    .toLowerCase()
    .replace(/[^a-z0-9,\- ]/g, "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(",");
}
