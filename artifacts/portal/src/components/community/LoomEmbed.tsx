import { extractLoomShareId, loomEmbedUrl } from "@/lib/loom";

export function LoomEmbed({ url }: { url: string }) {
  const id = extractLoomShareId(url);
  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-sm text-blue-600 hover:underline break-all"
      >
        {url}
      </a>
    );
  }
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-black" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src={loomEmbedUrl(id)}
        title="Loom video"
        allow="fullscreen; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
