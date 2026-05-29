import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import {
  useListChannels,
  useListPostsByChannel,
  useCreatePost,
  useDeletePost,
  usePinPost,
  useUnpinPost,
  useListComments,
  useCreateComment,
  useDeleteComment,
  useGetMe,
  getListPostsByChannelQueryKey,
  getListCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Pin,
  MessageSquare,
  MoreVertical,
  Trash2,
  Send,
  Loader2,
  ThumbsUp,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AdminOnlyNotice } from "@/components/community/AdminOnlyNotice";
import { GroupInfoCard } from "@/components/community/GroupInfoCard";
import { LeaderboardWidget } from "@/components/community/LeaderboardWidget";
import { StarterCard } from "@/components/community/StarterCard";
import "./community.css";
import { UserAvatar } from "@/components/user-avatar";
import { VideoEmbed } from "@/components/community/VideoEmbed";
import { UpcomingEventBanner } from "@/components/community/UpcomingEventBanner";
import { RecentCommenters } from "@/components/community/RecentCommenters";
import { parseVideoUrl } from "@/lib/video";
import { Bookmark, BookmarkCheck } from "lucide-react";

const CATEGORY_DOT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
];

function dotColor(channelId: number): string {
  return CATEGORY_DOT_COLORS[channelId % CATEGORY_DOT_COLORS.length]!;
}

async function toggleLike(postId: number): Promise<{ liked: boolean }> {
  const res = await fetch(`/api/posts/${postId}/likes/toggle`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to toggle like");
  return res.json();
}

async function toggleCommentMade(commentId: number): Promise<{ isBuild: boolean }> {
  const res = await fetch(`/api/comments/${commentId}/made-toggle`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to toggle 'I made this'");
  return res.json();
}

function PostComments({ postId }: { postId: number }) {
  const { data: comments, isLoading } = useListComments(postId, {
    query: { enabled: !!postId },
  });
  const { data: user } = useGetMe();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const handleCreateComment = () => {
    if (!newComment.trim()) return;
    createComment.mutate(
      { postId, data: { body: newComment } },
      {
        onSuccess: () => {
          setNewComment("");
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
        },
      },
    );
  };

  const handleDeleteComment = (commentId: number) => {
    deleteComment.mutate(
      { commentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
          toast({ title: "Comment deleted" });
        },
      },
    );
  };

  if (isLoading)
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading comments...
      </div>
    );

  return (
    <div className="border-t border-border mt-4 pt-4 space-y-3">
      {comments?.map((comment) => {
        const isBuild = (comment as { isBuild?: boolean }).isBuild === true;
        const canToggle = user?.role === "admin" || user?.id === comment.authorId;
        return (
          <div key={comment.id} className="flex gap-3">
            <UserAvatar
              name={comment.authorName}
              avatarUrl={(comment as { authorAvatarUrl?: string | null }).authorAvatarUrl}
              className="h-7 w-7"
              fallbackClassName="text-[10px]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {comment.authorName}
                </span>
                {isBuild && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    <span aria-hidden="true">✓</span> I made this
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {canToggle && (
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[11px] ${
                        isBuild
                          ? "text-emerald-700 hover:text-emerald-800"
                          : "text-muted-foreground hover:text-emerald-700"
                      }`}
                      onClick={async () => {
                        try {
                          await toggleCommentMade(comment.id);
                          queryClient.invalidateQueries({
                            queryKey: getListCommentsQueryKey(postId),
                          });
                        } catch {
                          toast({
                            title: "Couldn't update",
                            variant: "destructive",
                          });
                        }
                      }}
                      aria-label={isBuild ? "Remove I made this" : "Mark I made this"}
                    >
                      {isBuild ? "Unmark made" : "I made this"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete comment"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">
                {comment.body}
              </p>
            </div>
          </div>
        );
      })}
      <div className="flex gap-2 pt-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[40px] h-10 py-2 resize-none bg-muted/40 text-sm border-border"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCreateComment();
            }
          }}
        />
        <Button
          size="icon"
          aria-label="Send comment"
          onClick={handleCreateComment}
          disabled={!newComment.trim() || createComment.isPending}
        >
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

type RecentCommenter = { id: number; name: string; avatarUrl: string | null };
type ReactionAgg = { emoji: string; count: number; mine: boolean };

type ExtraPostFields = {
  authorAvatarUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
  loomUrl: string | null;
  videoUrl: string | null;
  videoProvider: string | null;
  videoEmbedId: string | null;
  tags: string[] | null;
  bookmarkedByMe: boolean;
  reactions: ReactionAgg[];
  lastCommentAt: string | null;
  recentCommenters: RecentCommenter[];
};

const REACTION_PALETTE = ["🔥", "❤️", "👏", "🤯", "⚡", "🙌"];

async function toggleBookmark(postId: number): Promise<{ bookmarked: boolean }> {
  const r = await fetch(`/api/posts/${postId}/bookmark/toggle`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed to bookmark");
  return r.json();
}

async function toggleReaction(postId: number, emoji: string): Promise<{ reacted: boolean }> {
  const r = await fetch(`/api/posts/${postId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ emoji }),
  });
  if (!r.ok) throw new Error("Failed to react");
  return r.json();
}

async function createPostRaw(
  channelId: number,
  body: string,
  videoUrl: string | null,
  tags: string[],
): Promise<void> {
  const payload: Record<string, unknown> = { body };
  if (videoUrl) payload.videoUrl = videoUrl;
  if (tags.length) payload.tags = tags;
  const res = await fetch(`/api/channels/${channelId}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}

export default function CommunityPage() {
  const { channelId } = useParams();
  const [, setLocation] = useLocation();
  const { data: channels, isLoading: channelsLoading } = useListChannels();
  const activeChannelId = channelId ? parseInt(channelId, 10) : undefined;
  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  const { data: posts, isLoading: postsLoading } = useListPostsByChannel(
    activeChannelId || 0,
    { query: { enabled: !!activeChannelId } },
  );
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const pinPost = usePinPost();
  const unpinPost = useUnpinPost();

  const [newPostContent, setNewPostContent] = useState("");
  const [newLoomUrl, setNewLoomUrl] = useState("");
  const [newTags, setNewTags] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [likePending, setLikePending] = useState<Record<number, boolean>>({});
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (channels && channels.length > 0 && !channelId) {
      const isAdmin = user?.role === "admin";
      const landing =
        channels.find((c) => !c.adminsOnly) ??
        (isAdmin ? channels[0] : channels.find((c) => !c.adminsOnly) ?? channels[0]);
      if (landing) setLocation(`/community/${landing.id}`);
    }
  }, [channels, channelId, setLocation, user?.role]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !activeChannelId) return;
    const trimmedVideo = newLoomUrl.trim();
    if (trimmedVideo && !parseVideoUrl(trimmedVideo)) {
      toast({
        title: "Video link not recognized",
        description: "Use a Loom, YouTube or Vimeo URL.",
        variant: "destructive",
      });
      return;
    }
    const tags = newTags
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 32)
      .slice(0, 6);
    setPosting(true);
    try {
      await createPostRaw(activeChannelId, newPostContent, trimmedVideo || null, tags);
      setNewPostContent("");
      setNewLoomUrl("");
      setNewTags("");
      setComposerOpen(false);
      queryClient.invalidateQueries({
        queryKey: getListPostsByChannelQueryKey(activeChannelId),
      });
    } catch (err) {
      toast({
        title: "Post failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleBookmark = async (postId: number) => {
    try {
      await toggleBookmark(postId);
      queryClient.invalidateQueries({
        queryKey: getListPostsByChannelQueryKey(activeChannelId!),
      });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleReact = async (postId: number, emoji: string) => {
    try {
      await toggleReaction(postId, emoji);
      queryClient.invalidateQueries({
        queryKey: getListPostsByChannelQueryKey(activeChannelId!),
      });
    } catch (err) {
      toast({
        title: "Couldn't react",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleToggleLike = async (postId: number) => {
    if (likePending[postId]) return;
    setLikePending((p) => ({ ...p, [postId]: true }));
    try {
      await toggleLike(postId);
      queryClient.invalidateQueries({
        queryKey: getListPostsByChannelQueryKey(activeChannelId!),
      });
    } catch (err) {
      toast({
        title: "Couldn't update like",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLikePending((p) => ({ ...p, [postId]: false }));
    }
  };

  if (channelsLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const canPost = activeChannel && (!activeChannel.adminsOnly || user?.role === "admin");

  return (
    <div className="baingers-community max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0 space-y-5">
          <StarterCard
            onWatchClick={() => {
              const video = document.querySelector("iframe, video, [data-loom-embed]");
              if (video) {
                const top =
                  video.getBoundingClientRect().top + window.scrollY - 90;
                window.scrollTo({ top, behavior: "smooth" });
              }
            }}
            onPostClick={() => setComposerOpen(true)}
          />
          {canPost && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              {composerOpen ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={user!.name}
                      avatarUrl={(user as { avatarUrl?: string | null }).avatarUrl}
                      className="h-9 w-9"
                      fallbackClassName="bg-foreground text-background text-xs"
                    />
                    <span className="text-sm text-muted-foreground">
                      Posting in{" "}
                      <span className="font-medium text-foreground">{activeChannel?.name}</span>
                    </span>
                  </div>
                  <Textarea
                    autoFocus
                    placeholder="What banger are you sharing?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="min-h-[120px] resize-none border-border focus-visible:ring-1"
                  />
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="url"
                      inputMode="url"
                      placeholder="Paste a Loom, YouTube or Vimeo link (optional)"
                      value={newLoomUrl}
                      onChange={(e) => setNewLoomUrl(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <Input
                    type="text"
                    placeholder="Tags (comma-separated, e.g. agents, rag, voice)"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setComposerOpen(false);
                        setNewPostContent("");
                        setNewLoomUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || posting}
                    >
                      {posting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Post
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setComposerOpen(true)}
                  className="flex items-center gap-3 w-full text-left"
                  aria-label="Open post composer"
                >
                  <UserAvatar
                    name={user!.name}
                    avatarUrl={(user as { avatarUrl?: string | null }).avatarUrl}
                    className="h-9 w-9"
                    fallbackClassName="bg-foreground text-background text-xs"
                  />
                  <span className="flex-1 px-4 py-2.5 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/70 transition-colors">
                    Introduce yourself. What do you want to make?
                  </span>
                </button>
              )}
            </div>
          )}

          <UpcomingEventBanner />

          <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
            <div className="flex items-center gap-2">
              {(() => {
                const defaultChannel =
                  channels?.find((c) => !c.adminsOnly) ?? channels?.[0];
                const isDefault = !!defaultChannel && activeChannelId === defaultChannel.id;
                return (
                  <Link
                    href={defaultChannel ? `/community/${defaultChannel.id}` : "/community"}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      isDefault
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </Link>
                );
              })()}
              {channels?.map((c) => {
                const active = activeChannelId === c.id;
                return (
                  <Link
                    key={c.id}
                    href={`/community/${c.id}`}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {activeChannel?.adminsOnly && user?.role !== "admin" && <AdminOnlyNotice />}

          {postsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            </div>
          ) : posts?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground">No posts yet</p>
              <p className="text-sm mt-1">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts?.map((postRaw) => {
                const post = postRaw as typeof postRaw & ExtraPostFields;
                const liked = !!post.likedByMe;
                const likeCount = post.likeCount ?? 0;
                const recentCommenters = post.recentCommenters ?? [];
                const lastCommentAt = post.lastCommentAt ?? null;
                return (
                  <article
                    key={post.id}
                    className={`bg-card border rounded-xl p-5 shadow-sm hover:border-foreground/20 transition-colors ${
                      post.isPinned
                        ? "border-amber-300 ring-1 ring-amber-200/60"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        name={post.authorName}
                        avatarUrl={post.authorAvatarUrl}
                        className="h-10 w-10 shrink-0"
                        fallbackClassName="text-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">
                            {post.authorName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            {activeChannel ? (
                              <>
                                <span className="mx-1.5">·</span>
                                <span>{activeChannel.name}</span>
                              </>
                            ) : null}
                          </span>
                        </div>
                      </div>

                      {post.isPinned && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="font-medium">Pinned</span>
                        </div>
                      )}

                      {(user?.role === "admin" || user?.id === post.authorId) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Post actions"
                              className="h-7 w-7 text-muted-foreground -mr-1"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user?.role === "admin" &&
                              (post.isPinned ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    unpinPost.mutate(
                                      { postId: post.id },
                                      {
                                        onSuccess: () =>
                                          queryClient.invalidateQueries({
                                            queryKey: getListPostsByChannelQueryKey(
                                              activeChannelId!,
                                            ),
                                          }),
                                      },
                                    );
                                  }}
                                >
                                  <Pin className="h-4 w-4 mr-2" /> Unpin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    pinPost.mutate(
                                      { postId: post.id },
                                      {
                                        onSuccess: () =>
                                          queryClient.invalidateQueries({
                                            queryKey: getListPostsByChannelQueryKey(
                                              activeChannelId!,
                                            ),
                                          }),
                                      },
                                    );
                                  }}
                                >
                                  <Pin className="h-4 w-4 mr-2" /> Pin
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => {
                                deletePost.mutate(
                                  { postId: post.id },
                                  {
                                    onSuccess: () => {
                                      queryClient.invalidateQueries({
                                        queryKey: getListPostsByChannelQueryKey(activeChannelId!),
                                      });
                                      toast({ title: "Post deleted" });
                                    },
                                  },
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="mt-3 flex items-start gap-2">
                      {activeChannelId && (
                        <span
                          className={`mt-2 h-2 w-2 rounded-full shrink-0 ${dotColor(activeChannelId)}`}
                          aria-hidden="true"
                        />
                      )}
                      <h2 className="font-semibold text-foreground text-base leading-snug">
                        {post.body.split("\n")[0]!.slice(0, 120)}
                      </h2>
                    </div>

                    {post.body.includes("\n") && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                        {post.body.split("\n").slice(1).join("\n")}
                      </p>
                    )}

                    {(post.videoUrl || post.loomUrl) && (
                      <div className="mt-4">
                        <VideoEmbed
                          url={post.videoUrl ?? post.loomUrl ?? ""}
                          provider={post.videoProvider}
                          embedId={post.videoEmbedId}
                        />
                      </div>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleLike(post.id)}
                          disabled={likePending[post.id]}
                          aria-pressed={liked}
                          aria-label={liked ? "Unlike post" : "Like post"}
                          className={`h-8 px-2 ${
                            liked
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <ThumbsUp
                            className={`h-4 w-4 mr-1.5 ${liked ? "fill-foreground" : ""}`}
                          />
                          <span className="text-xs font-medium">{likeCount}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedComments((p) => ({ ...p, [post.id]: !p[post.id] }))
                          }
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                          aria-expanded={!!expandedComments[post.id]}
                        >
                          <MessageSquare className="h-4 w-4 mr-1.5" />
                          <span className="text-xs font-medium">{post.commentCount}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBookmark(post.id)}
                          aria-pressed={!!post.bookmarkedByMe}
                          aria-label={post.bookmarkedByMe ? "Remove bookmark" : "Save for later"}
                          className={`h-8 px-2 ${
                            post.bookmarkedByMe ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {post.bookmarkedByMe ? (
                            <BookmarkCheck className="h-4 w-4" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {post.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => handleReact(post.id, r.emoji)}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                              r.mine
                                ? "bg-foreground text-background border-foreground"
                                : "bg-muted/50 border-border hover:border-foreground/40"
                            }`}
                            aria-pressed={r.mine}
                            aria-label={`React ${r.emoji}`}
                          >
                            <span>{r.emoji}</span>
                            <span className="ml-1 font-medium">{r.count}</span>
                          </button>
                        ))}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-foreground"
                              aria-label="Add a reaction"
                            >
                              <span className="text-base">+</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="flex gap-1 p-2">
                            {REACTION_PALETTE.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReact(post.id, emoji)}
                                className="text-lg p-1.5 rounded hover:bg-muted transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {recentCommenters.length > 0 && (
                        <RecentCommenters commenters={recentCommenters} />
                      )}

                      {lastCommentAt && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((p) => ({ ...p, [post.id]: true }))
                          }
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          New comment{" "}
                          {formatDistanceToNow(new Date(lastCommentAt), { addSuffix: true })}
                        </button>
                      )}
                    </div>

                    {expandedComments[post.id] && <PostComments postId={post.id} />}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="hidden lg:block space-y-4">
          <GroupInfoCard />
          <LeaderboardWidget />
        </aside>
      </div>
    </div>
  );
}
