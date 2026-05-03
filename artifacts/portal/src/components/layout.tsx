import { Link, useLocation } from "wouter";
import { useLogout, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, MessageSquare, ShieldAlert, Zap } from "lucide-react";
import { ReactNode } from "react";
import { ariaLabel } from "@/components/a11y";

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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="Portal home" className="flex items-center gap-2 text-primary font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
              <Zap className="h-5 w-5" aria-hidden="true" />
              <span>Portal</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              <Link
                href="/community"
                aria-label="Community"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  location.startsWith("/community") 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Community
              </Link>
              <Link
                href="/school"
                aria-label="School"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  location.startsWith("/school") 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                School
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  aria-label="Admin panel"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    location.startsWith("/admin") 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm hidden sm:block text-muted-foreground" aria-label={`Signed in as ${user.name}`}>
              {user.name}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} {...ariaLabel("Log out")} className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
