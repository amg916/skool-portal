import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Bookmark, MessageSquare, ThumbsUp } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { VideoEmbed } from "@/components/community/VideoEmbed";
import { TranscriptPanel } from "@/components/community/TranscriptPanel";
import { formatDistanceToNow } from "date-fns";

type Bookmark = {
  id: number;
  channelId: number;
  channelName: string | null;
  authorId: number;
  authorName: string | null;
  authorAvatarUrl: string | null;
  body: string;
  videoUrl: string | null;
  videoProvider: string | null;
  videoEmbedId: string | null;
  loomUrl: string | null;
  tags: string[] | null;
  createdAt: string;
  bookmarkedAt: string;
  likeCount: number;
  commentCount: number;
};

async function fetchBookmarks(): Promise<Bookmark[]> {
  const r = await fetch("/api/me/bookmarks", { credentials: "include" });
  if (!r.ok) throw new Error("Failed");
  return r.json();
}

export default function SavedPage() {
  const { data, isLoading } = useQuery({ queryKey: ["bookmarks"], queryFn: fetchBookmarks });

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-5">
        <Bookmark className="h-6 w-6" /> Saved
      </h1>
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">Nothing saved yet</p>
          <p className="text-sm mt-1">Bookmark a banger in the feed to find it here later.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {data!.map((p) => {
            const videoUrl = p.videoUrl ?? p.loomUrl;
            return (
              <li key={p.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <UserAvatar
                    name={p.authorName ?? "?"}
                    avatarUrl={p.authorAvatarUrl}
                    className="h-9 w-9"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {p.authorName ?? "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Link
                        href={`/community/${p.channelId}`}
                        className="hover:underline"
                      >
                        {p.channelName ?? "Community"}
                      </Link>
                      <span className="mx-1.5">·</span>
                      saved {formatDistanceToNow(new Date(p.bookmarkedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <h2 className="font-semibold text-base text-foreground leading-snug mb-2">
                  {p.body.split("\n")[0]?.slice(0, 140)}
                </h2>
                {p.body.includes("\n") && (
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap mb-3">
                    {p.body.split("\n").slice(1).join("\n")}
                  </p>
                )}
                {videoUrl && (
                  <>
                    <VideoEmbed
                      url={videoUrl}
                      provider={p.videoProvider}
                      embedId={p.videoEmbedId}
                    />
                    {p.videoProvider === "cloudflare-stream" && p.videoEmbedId && (
                      <TranscriptPanel streamUid={p.videoEmbedId} />
                    )}
                  </>
                )}
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" /> {p.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> {p.commentCount}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
