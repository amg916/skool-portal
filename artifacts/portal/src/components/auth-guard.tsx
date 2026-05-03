import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe({
    query: { retry: false }
  });

  useEffect(() => {
    if (!isLoading) {
      if (isError || !user) {
        setLocation("/login");
      } else if (user.forcePasswordChange && window.location.pathname !== "/force-change-password") {
        setLocation("/force-change-password");
      } else if (requireAdmin && user.role !== "admin") {
        setLocation("/");
      }
    }
  }, [isLoading, isError, user, setLocation, requireAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !user) {
    return null;
  }

  if (user.forcePasswordChange && window.location.pathname !== "/force-change-password") {
    return null;
  }

  if (requireAdmin && user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
