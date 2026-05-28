import { Link, useLocation } from "wouter";
import { useLogout, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Bell,
  LogOut,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { ReactNode, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { SearchDropdown } from "@/components/search-dropdown";
import { useGroup } from "@/lib/group";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/lib/chat-context";
import { useQuery } from "@tanstack/react-query";

const SUB_NAV = [
  { href: "/community", label: "Community" },
  { href: "/school", label: "Classroom" },
  { href: "/calendar", label: "Calendar" },
  { href: "/members", label: "Members" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/about", label: "About" },
] as const;

function isActiveTab(location: string, href: string): boolean {
  if (href === "/community") return location === "/" || location.startsWith("/community");
  return location.startsWith(href);
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe();
  const logoutMut = useLogout();
  const queryClient = useQueryClient();
  const { data: group } = useGroup();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const groupName = group?.name ?? "Portal";
  const groupIconUrl = group?.iconUrl ?? null;
  const brandInitial = groupName.charAt(0).toUpperCase();
  const { openChat } = useChat();
  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["chats-unread"],
    queryFn: async () => {
      const r = await fetch("/api/chats/unread/count", { credentials: "include" });
      if (!r.ok) return { count: 0 };
      return r.json();
    },
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unreadCount = unread?.count ?? 0;

  const handleLogout = () => {
    logoutMut.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        window.location.href = "/login";
      },
    });
  };

  const handleAvatarPick = () => fileRef.current?.click();

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Avatar updated" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try a smaller image.",
        variant: "destructive",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!user) return <>{children}</>;

  const userAvatarUrl = (user as { avatarUrl?: string | null }).avatarUrl ?? null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/community"
            className="flex items-center gap-2 group min-w-0"
            aria-label={`${groupName} home`}
          >
            {groupIconUrl ? (
              <img
                src={groupIconUrl}
                alt={groupName}
                className="h-8 w-8 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-sm shrink-0">
                {brandInitial}
              </div>
            )}
            <span className="font-semibold text-foreground truncate">{groupName}</span>
          </Link>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchDropdown />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              className="relative text-muted-foreground hover:text-foreground"
              onClick={() => openChat()}
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-3 min-w-[12px] px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="text-muted-foreground hover:text-foreground"
              title="Notifications coming soon"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarFile}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Account menu — ${user.name}`}
                >
                  <UserAvatar
                    name={user.name}
                    avatarUrl={userAvatarUrl}
                    className="h-8 w-8"
                    fallbackClassName="bg-foreground text-background text-xs"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium text-foreground">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAvatarPick} className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" /> Upload avatar
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center cursor-pointer">
                      <ShieldAlert className="h-4 w-4 mr-2" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <nav
          className="max-w-[1240px] mx-auto px-4 sm:px-6 flex items-end gap-6 overflow-x-auto"
          aria-label="Section navigation"
        >
          {SUB_NAV.map(({ href, label }) => {
            const active = isActiveTab(location, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative py-3 text-[15px] whitespace-nowrap transition-colors focus-visible:outline-none ${
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-foreground rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}
