import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { OAuthButtons } from "@/components/oauth-buttons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const loginMut = useLogin();

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthError = url.searchParams.get("oauth_error");
    if (oauthError) {
      toast({
        title: "Social sign-in didn't complete",
        description: humanizeError(oauthError),
        variant: "destructive",
      });
      url.searchParams.delete("oauth_error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMut.mutate(
      { data: { email, password } },
      {
        onSuccess: (user) => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          if (user.forcePasswordChange) {
            setLocation("/force-change-password");
          } else {
            setLocation("/community");
          }
        },
        onError: () => {
          toast({
            title: "Login failed",
            description: "Check your email and password and try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="mb-8 flex flex-col items-center">
        <div className="h-12 w-12 rounded-xl bg-foreground text-background flex items-center justify-center mb-3 font-extrabold text-lg">
          B
        </div>
        <h1 className="text-2xl font-bold text-foreground">Baingers</h1>
        <p className="text-muted-foreground text-sm mt-1">Sign in to join the heat</p>
      </Link>

      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Continue with a provider or with email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <OAuthButtons returnTo="/community" />

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loginMut.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginMut.isPending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginMut.isPending}>
              {loginMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign in with email
            </Button>
          </form>

          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-foreground hover:underline">
              Join free
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function humanizeError(code: string): string {
  switch (code) {
    case "missing_code":
    case "bad_state":
      return "The sign-in link expired. Please try again.";
    case "callback_failed":
      return "We couldn't finish setting up your account. Please try again.";
    case "access_denied":
      return "You cancelled the sign-in. Try again whenever you're ready.";
    default:
      return code;
  }
}
