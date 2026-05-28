import { useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthButtons } from "@/components/oauth-buttons";

export default function LoginPage() {
  const { toast } = useToast();

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthError = url.searchParams.get("oauth_error");
    if (oauthError) {
      toast({
        title: "Google sign-in didn't complete",
        description: humanizeError(oauthError),
        variant: "destructive",
      });
      url.searchParams.delete("oauth_error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [toast]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="mb-8 flex flex-col items-center">
        <div className="h-12 w-12 rounded-xl bg-foreground text-background flex items-center justify-center mb-3 font-extrabold text-lg">
          B
        </div>
        <h1 className="text-2xl font-bold text-foreground">Baingers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI banger videos. Under 10 min.
        </p>
      </Link>

      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Members-only. Use your Google account to enter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <OAuthButtons returnTo="/community" />
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            No password to remember. Your Google identity is verified by Google
            — we never see it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function humanizeError(code: string): string {
  switch (code) {
    case "missing_code":
    case "bad_state":
      return "The sign-in link expired. Try again.";
    case "callback_failed":
      return "We couldn't finish setting up your account. Try again.";
    case "access_denied":
      return "You cancelled the sign-in. Try again whenever you're ready.";
    default:
      return code;
  }
}
