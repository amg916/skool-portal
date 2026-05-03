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
  getListCommentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Hash, Pin, MessageSquare, MoreVertical, Trash2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminOnlyNotice } from "@/components/community/AdminOnlyNotice";

function PostComments({ postId }: { postId: number }) {
  const { data: comments, isLoading } = useListComments(postId, { query: { enabled: !!postId } });
  const { data: user } = useGetMe();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const handleCreateComment = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ data: { postId, body: newComment } }, {
      onSuccess: () => {
        setNewComment("");
        queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
      }
    });
  };

  const handleDeleteComment = (commentId: number) => {
    deleteComment.mutate({ commentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
        toast({ title: "Comment deleted" });
      }
    });
  };

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Loading comments...</div>;

  return (
    <div className="border-t border-border mt-4 pt-4 space-y-4">
      <div className="space-y-3">
        {comments?.map(comment => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-6 w-6 mt-0.5">
              <AvatarFallback className="text-[10px]">{comment.authorName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted p-3 rounded-md text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">{comment.authorName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {(user?.role === "admin" || user?.id === comment.authorId) && (
                    <Button variant="ghost" size="icon" aria-label="Delete comment" className="h-4 w-4 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring" onClick={() => handleDeleteComment(comment.id)}>
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{comment.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea 
          placeholder="Write a comment..." 
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="min-h-[40px] h-10 py-2 resize-none bg-background text-sm"
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCreateComment();
            }
          }}
        />
        <Button size="icon" aria-label="Send comment" onClick={handleCreateComment} disabled={!newComment.trim() || createComment.isPending} className="focus-visible:ring-2 focus-visible:ring-ring">
          {createComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
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
  const activeChannel = channels?.find(c => c.id === activeChannelId);

  const { data: posts, isLoading: postsLoading } = useListPostsByChannel(activeChannelId || 0, {
    query: { enabled: !!activeChannelId }
  });
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const pinPost = usePinPost();
  const unpinPost = useUnpinPost();

  const [newPostContent, setNewPostContent] = useState("");
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (channels && channels.length > 0 && !channelId) {
      setLocation(`/community/${channels[0].id}`);
    }
  }, [channels, channelId, setLocation]);

  const handleCreatePost = () => {
    if (!newPostContent.trim() || !activeChannelId) return;
    createPost.mutate({ data: { channelId: activeChannelId, body: newPostContent } }, {
      onSuccess: () => {
        setNewPostContent("");
        queryClient.invalidateQueries({ queryKey: getListPostsByChannelQueryKey(activeChannelId) });
      }
    });
  };

  if (channelsLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const canPost = activeChannel && (!activeChannel.adminsOnly || user?.role === "admin");

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-6xl mx-auto w-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card/30 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground tracking-tight">Channels</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {channels?.map(channel => (
              <Link 
                key={channel.id} 
                href={`/community/${channel.id}`}
                aria-label={`${channel.name} channel${channel.adminsOnly ? " (admin only)" : ""}`}
                aria-current={activeChannelId === channel.id ? "page" : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeChannelId === channel.id 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Hash className="h-4 w-4" aria-hidden="true" />
                {channel.name}
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {activeChannel ? (
          <>
            <div className="p-4 border-b border-border bg-card/50 flex flex-col justify-center sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Hash className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h1 className="text-lg font-bold">{activeChannel.name}</h1>
              </div>
              {activeChannel.description && (
                <p className="text-sm text-muted-foreground mt-1">{activeChannel.description}</p>
              )}
            </div>

            <ScrollArea className="flex-1 p-4 md:p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {activeChannel.adminsOnly && user?.role !== "admin" && (
                  <AdminOnlyNotice />
                )}
                {canPost && (
                  <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <Textarea 
                      placeholder={`Message #${activeChannel.name}`}
                      value={newPostContent}
                      onChange={e => setNewPostContent(e.target.value)}
                      className="min-h-[100px] resize-none mb-3 bg-background border-none focus-visible:ring-1"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleCreatePost} disabled={!newPostContent.trim() || createPost.isPending}>
                        {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Post
                      </Button>
                    </div>
                  </div>
                )}

                {postsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : posts?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Hash className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No posts in this channel yet.</p>
                    <p className="text-sm mt-1">Be the first to start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {posts?.map(post => (
                      <div key={post.id} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {post.authorName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{post.authorName}</span>
                                {post.isPinned && <Pin className="h-3 w-3 text-accent" />}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {(user?.role === "admin" || user?.id === post.authorId) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Post actions" className="h-8 w-8 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {user?.role === "admin" && (
                                  post.isPinned ? (
                                    <DropdownMenuItem onClick={() => {
                                      unpinPost.mutate({ postId: post.id }, {
                                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPostsByChannelQueryKey(activeChannelId) })
                                      });
                                    }}>
                                      <Pin className="h-4 w-4 mr-2" /> Unpin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => {
                                      pinPost.mutate({ postId: post.id }, {
                                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPostsByChannelQueryKey(activeChannelId) })
                                      });
                                    }}>
                                      <Pin className="h-4 w-4 mr-2" /> Pin
                                    </DropdownMenuItem>
                                  )
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  onClick={() => {
                                    deletePost.mutate({ postId: post.id }, {
                                      onSuccess: () => {
                                        queryClient.invalidateQueries({ queryKey: getListPostsByChannelQueryKey(activeChannelId) });
                                        toast({ title: "Post deleted" });
                                      }
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                          {post.body}
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            aria-label={`${expandedComments[post.id] ? "Hide" : "Show"} comments (${post.commentCount})`}
                            aria-expanded={!!expandedComments[post.id]}
                            className="text-muted-foreground hover:text-foreground -ml-2 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                            {post.commentCount} {post.commentCount === 1 ? 'Comment' : 'Comments'}
                          </Button>
                        </div>

                        {expandedComments[post.id] && (
                          <PostComments postId={post.id} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
            Select a channel from the sidebar to view conversations.
          </div>
        )}
      </div>
    </div>
  );
}
