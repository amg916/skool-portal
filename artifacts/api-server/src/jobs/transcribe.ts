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
 *   1. Fetch the CF Stream MP4 download (audio + video — Whisper handles both).
 *   2. POST multipart/form-data to an OpenAI-compatible transcription endpoint
 *      (base URL from env — OpenAI today, or a self-hosted NVIDIA Whisper NIM /
 *      any OpenAI-compatible ASR by pointing TRANSCRIBE_BASE_URL at it).
 *   3. Save transcript onto the recording row.
 *   4. Best-effort: generate comma-separated tag hints via the Claude
 *      subscription fleet (the fleet-gateway, not the paid API) for nicer
 *      post defaults.
 *
 * Provider routing (see the two helpers below):
 *   - Audio→text: OpenAI-compatible REST, base URL configurable. NVIDIA's FREE
 *     *hosted* Whisper (build.nvidia.com) is gRPC-only (grpc.nvcf.nvidia.com)
 *     and wants mono 16k WAV, so it can't be a drop-in here — but a self-hosted
 *     NVIDIA Whisper NIM exposes the standard /v1/audio/transcriptions REST and
 *     works by setting TRANSCRIBE_BASE_URL + TRANSCRIBE_API_KEY.
 *   - Tag hint: routed to the subscription fleet via FLEET_GATEWAY_URL, so it
 *     bills the Max plan, not the Anthropic API.
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

    // Audio→text provider is chosen by env so we can move off the paid OpenAI
    // API without a code change. Defaults preserve the previous OpenAI behavior.
    // Point TRANSCRIBE_BASE_URL at a self-hosted NVIDIA Whisper NIM (or any
    // OpenAI-compatible ASR) to use that instead.
    const asrBaseUrl = (
      process.env["TRANSCRIBE_BASE_URL"] || "https://api.openai.com/v1"
    ).replace(/\/+$/, "");
    const asrKey =
      process.env["TRANSCRIBE_API_KEY"] ||
      process.env["NVIDIA_API_KEY"] ||
      process.env["OPENAI_API_KEY"];
    const asrModel = process.env["TRANSCRIBE_MODEL"] || "whisper-1";
    if (!asrKey) {
      console.warn(
        "[transcribe] no ASR key (TRANSCRIBE_API_KEY / NVIDIA_API_KEY / OPENAI_API_KEY); skipping",
      );
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

    // POST to the OpenAI-compatible transcription endpoint.
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(audioBuf)], { type: "video/mp4" }),
      `banger-${rec.streamUid}.mp4`,
    );
    form.append("model", asrModel);
    form.append("response_format", "text");

    const r = await fetch(`${asrBaseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${asrKey}` },
      body: form,
    });
    if (!r.ok) {
      const text = await r.text();
      console.error("[transcribe] ASR error", r.status, text.slice(0, 400));
      await db
        .update(recordingsTable)
        .set({
          errorMessage: `Transcription failed: ASR ${r.status}`,
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

// Routed through the subscription fleet (fleet-gateway), NOT the paid Anthropic
// API. The gateway speaks the Anthropic Messages wire shape but runs `claude -p`
// on the Max plan, so this billed the API before and now bills the subscription.
// If the gateway isn't configured we skip tags rather than fall back to the API.
async function suggestTagsViaClaude(transcript: string): Promise<string | null> {
  const gatewayUrl = process.env["FLEET_GATEWAY_URL"];
  const gatewayToken = process.env["FLEET_GATEWAY_TOKEN"];
  if (!gatewayUrl || !gatewayToken) return null;
  const r = await fetch(`${gatewayUrl.replace(/\/+$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({
      model: process.env["FLEET_TAG_MODEL"] || "claude-sonnet-4-6",
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
