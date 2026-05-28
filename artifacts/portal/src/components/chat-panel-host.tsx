import { useChat } from "@/lib/chat-context";
import { ChatPanel } from "@/components/chat-panel";
import { useGetMe } from "@workspace/api-client-react";

export function ChatPanelHost() {
  const { data: user } = useGetMe();
  const { open, initialUserId, closeChat } = useChat();
  if (!user) return null;
  return (
    <ChatPanel
      open={open}
      onOpenChange={(o) => !o && closeChat()}
      initialUserId={initialUserId}
    />
  );
}
