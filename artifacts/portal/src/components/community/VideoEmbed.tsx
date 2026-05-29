import { parseVideoUrl, embedUrl } from "@/lib/video";

export function VideoEmbed({ url, provider, embedId }: { url: string; provider?: string | null; embedId?: string | null }) {
  let p = provider as "loom" | "youtube" | "vimeo" | "cloudflare-stream" | undefined | null;
  let id = embedId ?? null;
  if (!p || !id) {
    const parsed = parseVideoUrl(url);
    if (parsed) {
      p = parsed.provider;
      id = parsed.embedId;
    }
  }
  if (!p || !id) {
    return (
      <a href={url} target="_blank" rel="noreferrer noopener" className="text-sm text-blue-600 hover:underline break-all">
        {url}
      </a>
    );
  }
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-black" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src={embedUrl(p, id)}
        title="Video"
        allow="fullscreen; clipboard-write; encrypted-media; picture-in-picture; web-share; accelerometer; autoplay; gyroscope"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
