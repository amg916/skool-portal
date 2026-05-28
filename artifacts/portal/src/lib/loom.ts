const SHARE_ID_RE = /^[a-f0-9]{32}$/i;

export function extractLoomShareId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!/^(www\.)?loom\.com$/i.test(url.host)) return null;
    const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
    return SHARE_ID_RE.test(last) ? last.toLowerCase() : null;
  } catch {
    return SHARE_ID_RE.test(trimmed) ? trimmed.toLowerCase() : null;
  }
}

export function loomEmbedUrl(shareId: string): string {
  return `https://www.loom.com/embed/${shareId}?hideEmbedTopBar=false`;
}
