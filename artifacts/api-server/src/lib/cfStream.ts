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
 * Mint a one-time direct-creator-upload URL via the SIMPLE (non-tus) endpoint.
 *
 * POST /accounts/{acct}/stream/direct_upload
 * Body: { maxDurationSeconds, creator?, expiry?, ... }
 * Returns: { uploadURL, uid }
 *
 * The client can PUT the file as multipart/form-data to uploadURL. CF Stream
 * accepts a single PUT (full file at once); it does NOT accept tus PATCHes
 * on this URL. For chunked resumable uploads we'd use the ?direct_user=true
 * tus endpoint, but that requires knowing the file size up front — which
 * MediaRecorder can't tell us until recording stops.
 *
 * Spec: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
 */
export async function createDirectUpload(opts: {
  maxDurationSeconds: number;
  meta?: Record<string, string>;
  creatorId?: string;
}): Promise<{ uploadUrl: string; uid: string }> {
  const accountId = cfStreamAccountId();
  const body: Record<string, unknown> = {
    maxDurationSeconds: opts.maxDurationSeconds,
  };
  if (opts.creatorId) body["creator"] = opts.creatorId;
  if (opts.meta) body["meta"] = opts.meta;

  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: cfHeaders(),
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF Stream direct-upload create failed: ${res.status} ${text}`);
  }

  const j = (await res.json()) as {
    result?: { uploadURL?: string; uid?: string };
    success?: boolean;
    errors?: Array<{ message: string }>;
  };
  if (!j.success || !j.result?.uploadURL || !j.result.uid) {
    throw new Error(
      `CF Stream direct-upload bad response: ${JSON.stringify(j.errors ?? j)}`,
    );
  }
  return { uploadUrl: j.result.uploadURL, uid: j.result.uid };
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
 * Only valid once `provisionMp4Download` has been called for the uid AND
 * CF reports `result.default.status === "ready"`.
 */
export function streamMp4Url(uid: string): string {
  return `https://${cfStreamSubdomain()}.cloudflarestream.com/${uid}/downloads/default.mp4`;
}

/**
 * Provision a downloadable MP4 for a Stream video. CF generates the .mp4
 * asynchronously after this call. Idempotent — calling again for an
 * already-provisioned video returns the existing state.
 *
 * Returns the CF-reported state: { status: "inprogress" | "ready", percent }.
 *
 * Spec: https://developers.cloudflare.com/stream/viewing-videos/download-videos/
 */
export async function provisionMp4Download(uid: string): Promise<{
  status: string;
  percentComplete: number;
  url: string;
}> {
  const accountId = cfStreamAccountId();
  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/stream/${uid}/downloads`,
    {
      method: "POST",
      headers: cfHeaders(),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF Stream provision-mp4 failed: ${res.status} ${text}`);
  }
  const j = (await res.json()) as {
    result?: {
      default?: { status?: string; percentComplete?: number; url?: string };
    };
  };
  const d = j.result?.default;
  return {
    status: d?.status ?? "unknown",
    percentComplete: d?.percentComplete ?? 0,
    url: d?.url ?? streamMp4Url(uid),
  };
}

/**
 * Poll the MP4 download endpoint until it reports ready (or timeout).
 * Returns the final state object.
 */
export async function waitForMp4Ready(
  uid: string,
  opts: { timeoutMs?: number; pollMs?: number } = {},
): Promise<{ status: string; percentComplete: number; url: string }> {
  const accountId = cfStreamAccountId();
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const pollMs = opts.pollMs ?? 5_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(
      `${CF_BASE}/accounts/${accountId}/stream/${uid}/downloads`,
      { headers: cfHeaders() },
    );
    if (res.ok) {
      const j = (await res.json()) as {
        result?: {
          default?: {
            status?: string;
            percentComplete?: number;
            url?: string;
          };
        };
      };
      const d = j.result?.default;
      if (d?.status === "ready") {
        return {
          status: "ready",
          percentComplete: 100,
          url: d.url ?? streamMp4Url(uid),
        };
      }
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`CF Stream MP4 not ready after ${timeoutMs}ms for ${uid}`);
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
