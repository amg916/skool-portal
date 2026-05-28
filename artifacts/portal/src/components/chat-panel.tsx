import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatDistanceToNow } from "date-fns";

type Conversation = {
  chat_id: number;
  other_id: number;
  other_name: string;
  other_avatar_url: string | null;
  last_message_at: string;
  last_body: string | null;
  last_sender_id: number | null;
  unread: number;
};

type ChatMessage = {
  id: number;
  chatId: number;
  senderId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
};

async function fetchChats(): Promise<Conversation[]> {
  const r = await fetch("/api/chats", { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load chats");
  return r.json();
}

async function fetchChatWith(userId: number): Promise<{
  chatId: number;
  other: { id: number; name: string; avatarUrl: string | null };
  messages: ChatMessage[];
}> {
  const r = await fetch(`/api/chats/with/${userId}`, { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load chat");
  return r.json();
}

async function sendMessage(userId: number, body: string): Promise<ChatMessage> {
  const r = await fetch(`/api/chats/with/${userId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUserId?: number | null;
};

export function ChatPanel({ open, onOpenChange, initialUserId }: Props) {
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && initialUserId) setActiveUserId(initialUserId);
    if (!open) setActiveUserId(null);
  }, [open, initialUserId]);

  const listQuery = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
    enabled: open && !activeUserId,
    refetchInterval: open ? 15_000 : false,
  });

  const convoQuery = useQuery({
    queryKey: ["chat-with", activeUserId],
    queryFn: () => fetchChatWith(activeUserId!),
    enabled: !!activeUserId && open,
    refetchInterval: open && activeUserId ? 8_000 : false,
  });

  const [draft, setDraft] = useState("");

  const sendMut = useMutation({
    mutationFn: (text: string) => sendMessage(activeUserId!, text),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["chat-with", activeUserId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chats-unread"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convoQuery.data?.messages.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[460px] h-[640px] max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center gap-2 space-y-0">
          {activeUserId ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveUserId(null)}
                aria-label="Back to conversations"
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <UserAvatar
                name={convoQuery.data?.other.name ?? "?"}
                avatarUrl={convoQuery.data?.other.avatarUrl ?? null}
                className="h-7 w-7"
                fallbackClassName="text-[11px]"
              />
              <DialogTitle className="text-sm font-semibold truncate">
                {convoQuery.data?.other.name ?? "Loading…"}
              </DialogTitle>
            </>
          ) : (
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Messages
            </DialogTitle>
          )}
        </DialogHeader>

        {activeUserId ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {convoQuery.isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                </div>
              ) : convoQuery.data?.messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Say hi to {convoQuery.data?.other.name}.
                </div>
              ) : (
                convoQuery.data?.messages.map((m) => {
                  const mine = m.senderId === me?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                          mine
                            ? "bg-foreground text-background rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        {m.body}
                        <div
                          className={`text-[10px] mt-1 opacity-60 ${
                            mine ? "text-right" : ""
                          }`}
                        >
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message"
                className="resize-none min-h-[40px] h-10 py-2 text-sm border-border"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim()) sendMut.mutate(draft.trim());
                  }
                }}
              />
              <Button
                size="icon"
                onClick={() => draft.trim() && sendMut.mutate(draft.trim())}
                disabled={!draft.trim() || sendMut.isPending}
                aria-label="Send message"
              >
                {sendMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {listQuery.isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-5 w-5 animate-spin text-foreground" />
              </div>
            ) : (listQuery.data ?? []).length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-16 px-6">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-foreground">No conversations yet</p>
                <p className="mt-1">
                  Open the Members page and tap "Chat" on someone to start one.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {listQuery.data?.map((c) => (
                  <li key={c.chat_id}>
                    <button
                      onClick={() => setActiveUserId(c.other_id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50"
                    >
                      <UserAvatar
                        name={c.other_name}
                        avatarUrl={c.other_avatar_url}
                        className="h-10 w-10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {c.other_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(c.last_message_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span
                            className={`text-xs truncate ${
                              c.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {c.last_sender_id === me?.id && "You: "}
                            {c.last_body ?? "No messages yet"}
                          </span>
                          {c.unread > 0 && (
                            <span className="bg-accent text-accent-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0">
                              {c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
