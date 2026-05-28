import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ChatContextValue = {
  open: boolean;
  initialUserId: number | null;
  openChat: (userId?: number) => void;
  closeChat: () => void;
};

const ChatCtx = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialUserId, setInitialUserId] = useState<number | null>(null);

  const openChat = useCallback((userId?: number) => {
    setInitialUserId(userId ?? null);
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
    setInitialUserId(null);
  }, []);

  return (
    <ChatCtx.Provider value={{ open, initialUserId, openChat, closeChat }}>
      {children}
    </ChatCtx.Provider>
  );
}

export function useChat() {
  const v = useContext(ChatCtx);
  if (!v) throw new Error("useChat must be used inside ChatProvider");
  return v;
}
