import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GroupInfoCard } from "@/components/community/GroupInfoCard";
import { Calendar as CalendarIcon, MessageCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { UserAvatar } from "@/components/user-avatar";
import { useChat } from "@/lib/chat-context";
import { useGetMe } from "@workspace/api-client-react";

type Member = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
  handle: string;
  joinedAt: string;
  avatarUrl?: string | null;
};

async function fetchMembers(): Promise<Member[]> {
  const res = await fetch("/api/members", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load members");
  return res.json();
}

type Filter = "all" | "admins";

export default function MembersPage() {
  const { data: members, isLoading } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const [filter, setFilter] = useState<Filter>("all");
  const { openChat } = useChat();
  const { data: me } = useGetMe();

  const filtered = (members ?? []).filter((m) => {
    if (filter === "admins") return m.role === "admin";
    return true;
  });

  const total = members?.length ?? 0;
  const admins = members?.filter((m) => m.role === "admin").length ?? 0;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Chip active={filter === "all"} onClick={() => setFilter("all")} count={total}>
                Members
              </Chip>
              <Chip active={filter === "admins"} onClick={() => setFilter("admins")} count={admins}>
                Admins
              </Chip>
            </div>
            <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full">
              Invite a builder
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
              No members yet.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {filtered.map((m) => (
                <div key={m.id} className="p-5 flex items-start gap-4">
                  <UserAvatar
                    name={m.name}
                    avatarUrl={m.avatarUrl}
                    className="h-12 w-12 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{m.name}</span>
                      {m.role === "admin" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-foreground text-background">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">@{m.handle}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>Joined {format(new Date(m.joinedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  {me?.id !== m.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openChat(m.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1.5" />
                      Chat
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <GroupInfoCard />
        </aside>
      </div>
    </div>
  );
}

function Chip({
  active,
  count,
  children,
  onClick,
}: {
  active: boolean;
  count?: number;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span className={`text-xs ${active ? "opacity-70" : "opacity-60"}`}>{count}</span>
      )}
    </button>
  );
}
