import { Link, useLocation } from "wouter";
import { useLogout, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Search,
  MessageCircle,
  Bell,
  LogOut,
  ChevronsUpDown,
  ShieldAlert,
} from "lucide-react";
import { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BRAND_NAME = "Portal";
const BRAND_INITIAL = "P";

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

  const handleLogout = () => {
    logoutMut.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        window.location.href = "/login";
      },
    });
  };

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/community"
            className="flex items-center gap-2 group min-w-0"
            aria-label={`${BRAND_NAME} home`}
          >
            <div className="h-8 w-8 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-sm shrink-0">
              {BRAND_INITIAL}
            </div>
            <span className="font-semibold text-foreground truncate">
              {BRAND_NAME}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </Link>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search"
                aria-label="Search"
                className="w-full h-10 pl-9 pr-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Messages"
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Account menu — ${user.name}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium text-foreground">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
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
