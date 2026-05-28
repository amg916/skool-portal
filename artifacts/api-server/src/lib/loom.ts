const LOOM_HOST_RE = /^(?:www\.)?(?:loom\.com)$/i;
const SHARE_ID_RE = /^[a-f0-9]{32}$/i;

export function extractLoomShareId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!LOOM_HOST_RE.test(url.host)) return null;
    const seg = url.pathname.split("/").filter(Boolean);
    const last = seg[seg.length - 1] ?? "";
    return SHARE_ID_RE.test(last) ? last.toLowerCase() : null;
  } catch {
    return SHARE_ID_RE.test(trimmed) ? trimmed.toLowerCase() : null;
  }
}

export function canonicalLoomShareUrl(shareId: string): string {
  return `https://www.loom.com/share/${shareId}`;
}
