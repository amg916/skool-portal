import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
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

type SignupBody = { name: string; email: string; password: string };

async function signup(body: SignupBody) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Sign-up failed");
  }
  return res.json();
}

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/community");
    },
    onError: (e) =>
      toast({
        title: "Couldn't create account",
        description: e instanceof Error ? e.message : "Try a different email.",
        variant: "destructive",
      }),
  });

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="mb-8 flex flex-col items-center">
        <div className="h-12 w-12 rounded-xl bg-foreground text-background flex items-center justify-center mb-3 font-extrabold text-lg">
          B
        </div>
        <h1 className="text-2xl font-bold text-foreground">Baingers</h1>
        <p className="text-muted-foreground text-sm mt-1">Join the heat</p>
      </Link>

      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Free, takes 10 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <OAuthButtons returnTo="/community" />

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({ name, email, password });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Banger"
                required
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                minLength={8}
                required
                disabled={mutation.isPending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create account
            </Button>
          </form>

          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
