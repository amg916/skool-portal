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
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      {comments?.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-muted">
              {comment.authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {comment.authorName}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {(user?.role === "admin" || user?.id === comment.authorId) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete comment"
                  className="h-5 w-5 ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </Button>
              )}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">
              {comment.body}
            </p>
          </div>
        </div>
      ))}
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (channels && channels.length > 0 && !channelId) {
      setLocation(`/community/${channels[0]!.id}`);
    }
  }, [channels, channelId, setLocation]);

  const handleCreatePost = () => {
    if (!newPostContent.trim() || !activeChannelId) return;
    createPost.mutate(
      { channelId: activeChannelId!, data: { body: newPostContent } },
      {
        onSuccess: () => {
          setNewPostContent("");
          setComposerOpen(false);
          queryClient.invalidateQueries({
            queryKey: getListPostsByChannelQueryKey(activeChannelId),
          });
        },
      },
    );
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
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0 space-y-5">
          {canPost && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              {composerOpen ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                        {user!.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      Posting in{" "}
                      <span className="font-medium text-foreground">{activeChannel?.name}</span>
                    </span>
                  </div>
                  <Textarea
                    autoFocus
                    placeholder="Write something..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="min-h-[120px] resize-none border-border focus-visible:ring-1"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setComposerOpen(false);
                        setNewPostContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || createPost.isPending}
                    >
                      {createPost.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
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
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                      {user!.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 px-4 py-2.5 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/70 transition-colors">
                    Write something
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
            <div className="flex items-center gap-2">
              <Link
                href={channels && channels[0] ? `/community/${channels[0].id}` : "/community"}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !channelId || (channels && channelId === String(channels[0]?.id))
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </Link>
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
            <Button
              variant="ghost"
              size="icon"
              aria-label="Filter posts"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
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
              {posts?.map((post) => (
                <article
                  key={post.id}
                  className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-muted text-foreground text-sm font-semibold">
                        {post.authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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

                  <div className="mt-4 flex items-center gap-1 text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <ThumbsUp className="h-4 w-4 mr-1.5" />
                      <span className="text-xs font-medium">0</span>
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
                  </div>

                  {expandedComments[post.id] && <PostComments postId={post.id} />}
                </article>
              ))}
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
