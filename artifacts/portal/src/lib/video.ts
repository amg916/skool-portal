export type VideoProvider = "loom" | "youtube" | "vimeo";

export type ParsedVideo = {
  provider: VideoProvider;
  embedId: string;
  canonicalUrl: string;
};

const LOOM_ID_RE = /^[a-f0-9]{32}$/i;
const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID_RE = /^[0-9]+$/;

export function parseVideoUrl(input: string | null | undefined): ParsedVideo | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.host.toLowerCase().replace(/^www\./, "");

  if (host === "loom.com") {
    const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
    if (LOOM_ID_RE.test(id))
      return { provider: "loom", embedId: id.toLowerCase(), canonicalUrl: `https://www.loom.com/share/${id.toLowerCase()}` };
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && YT_ID_RE.test(v))
      return { provider: "youtube", embedId: v, canonicalUrl: `https://www.youtube.com/watch?v=${v}` };
    const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      const id = shortsMatch[1]!;
      return { provider: "youtube", embedId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` };
    }
    const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      const id = embedMatch[1]!;
      return { provider: "youtube", embedId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` };
    }
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    if (YT_ID_RE.test(id))
      return { provider: "youtube", embedId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    if (VIMEO_ID_RE.test(last))
      return { provider: "vimeo", embedId: last, canonicalUrl: `https://vimeo.com/${last}` };
  }

  return null;
}

export function embedUrl(provider: VideoProvider, embedId: string): string {
  switch (provider) {
    case "loom":
      return `https://www.loom.com/embed/${embedId}`;
    case "youtube":
      return `https://www.youtube.com/embed/${embedId}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${embedId}`;
  }
}
