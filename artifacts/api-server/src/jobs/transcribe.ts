import { eq } from "drizzle-orm";
import { db, recordingsTable } from "@workspace/db";
import { streamMp4Url } from "../lib/cfStream.js";

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

    const mp4Url = rec.mp4Url || streamMp4Url(rec.streamUid);

    // Wait up to ~3 min for CF MP4 download to become available (CF makes it
    // available shortly after `ready`, but not instantly).
    let audioBuf: Buffer | null = null;
    for (let attempt = 0; attempt < 18; attempt++) {
      const r = await fetch(mp4Url);
      if (r.ok) {
        const ab = await r.arrayBuffer();
        audioBuf = Buffer.from(ab);
        break;
      }
      await new Promise((res) => setTimeout(res, 10_000));
    }
    if (!audioBuf) {
      console.error(
        "[transcribe] could not download MP4 for",
        rec.streamUid,
        "after retries",
      );
      await db
        .update(recordingsTable)
        .set({ errorMessage: "Transcription unavailable: MP4 download timed out" })
        .where(eq(recordingsTable.id, recordingId));
      return;
    }

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
