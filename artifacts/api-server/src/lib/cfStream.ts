/**
 * Cloudflare Stream client helpers.
 *
 * Env vars (set in /home/ubuntu/env/skool-portal.env on prime):
 *   CF_ACCOUNT_ID
 *   CF_STREAM_TOKEN              (Stream:Edit + Stream:Read)
 *   CF_STREAM_CUSTOMER_SUBDOMAIN (e.g. customer-xu3qlilubd087z7q)
 *   CF_STREAM_WEBHOOK_SECRET     (HMAC for verifying webhook payloads)
 */

const CF_BASE = "https://api.cloudflare.com/client/v4";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function cfStreamAccountId(): string {
  return need("CF_ACCOUNT_ID");
}

export function cfStreamSubdomain(): string {
  return need("CF_STREAM_CUSTOMER_SUBDOMAIN");
}

function cfHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${need("CF_STREAM_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

/**
 * Mint a one-time tus upload URL for direct browser → CF Stream uploading.
 * Returns the upload URL the client will POST to and the stream UID.
 *
 * The tus protocol response embeds the stream UID in the Location header
 * (final path segment). We surface it for the client + DB row.
 *
 * Spec: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
 */
export async function createDirectUpload(opts: {
  maxDurationSeconds: number;
  meta?: Record<string, string>;
  creatorId?: string;
}): Promise<{ uploadUrl: string; uid: string }> {
  const accountId = cfStreamAccountId();
  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        ...cfHeaders(),
        // tus-resumable upload requires these headers on the create call:
        "Tus-Resumable": "1.0.0",
        "Upload-Length": "0",
        "Upload-Metadata": [
          opts.maxDurationSeconds
            ? `maxDurationSeconds ${btoa(String(opts.maxDurationSeconds))}`
            : "",
          opts.creatorId ? `creator ${btoa(opts.creatorId)}` : "",
          ...Object.entries(opts.meta ?? {}).map(
            ([k, v]) => `${k} ${btoa(v)}`,
          ),
        ]
          .filter(Boolean)
          .join(","),
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF Stream direct-upload create failed: ${res.status} ${text}`);
  }

  const location = res.headers.get("Location");
  const streamId = res.headers.get("stream-media-id");
  if (!location || !streamId) {
    throw new Error(
      `CF Stream direct-upload missing Location or stream-media-id header`,
    );
  }
  return { uploadUrl: location, uid: streamId };
}

/**
 * Fetch a single video's details from CF Stream.
 */
export async function getStreamVideo(uid: string): Promise<{
  uid: string;
  status: { state: string; errorReasonText?: string };
  duration?: number;
  thumbnail?: string;
  playback?: { hls?: string; dash?: string };
  preview?: string;
}> {
  const accountId = cfStreamAccountId();
  const res = await fetch(`${CF_BASE}/accounts/${accountId}/stream/${uid}`, {
    headers: cfHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF Stream get failed: ${res.status} ${text}`);
  }
  const j = (await res.json()) as { result: unknown };
  return j.result as Awaited<ReturnType<typeof getStreamVideo>>;
}

/**
 * Build the public iframe embed URL for a stream UID.
 * Uses the account's customer subdomain.
 */
export function streamEmbedUrl(uid: string): string {
  return `https://${cfStreamSubdomain()}.cloudflarestream.com/${uid}/iframe`;
}

/**
 * Build the MP4 download URL (used for Whisper audio extraction).
 * CF Stream provides this once encoding is ready when "downloadable" is true.
 */
export function streamMp4Url(uid: string): string {
  return `https://${cfStreamSubdomain()}.cloudflarestream.com/${uid}/downloads/default.mp4`;
}

/**
 * Verify a CF Stream webhook payload's HMAC-SHA256 signature.
 *
 * CF sends a `Webhook-Signature` header that contains:
 *   `time=<unix_seconds>,sig1=<hex_hmac>`
 *
 * The HMAC is computed as: HMAC_SHA256(secret, `${time}.${raw_body}`)
 *
 * Spec: https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/
 */
export async function verifyStreamWebhook(
  rawBody: string,
  signatureHeader: string | undefined,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = process.env["CF_STREAM_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("[cfStream] CF_STREAM_WEBHOOK_SECRET unset; refusing webhook");
    return false;
  }
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    }),
  );
  const time = parts["time"];
  const sig1 = parts["sig1"];
  if (!time || !sig1) return false;

  // Reject events with stale timestamps (replay protection — 10 min window).
  const tsSec = Number(time);
  if (!Number.isFinite(tsSec)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsSec) > 600) return false;

  const crypto = await import("node:crypto");
  const computed = crypto
    .createHmac("sha256", secret)
    .update(`${time}.${rawBody}`)
    .digest("hex");

  // Constant-time compare
  if (computed.length !== sig1.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig1));
}
