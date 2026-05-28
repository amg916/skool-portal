import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

type ProvidersResponse = { providers: Array<"google" | "facebook" | "github"> };

async function fetchProviders(): Promise<ProvidersResponse> {
  const res = await fetch("/api/auth/providers", { credentials: "include" });
  if (!res.ok) return { providers: [] };
  return res.json();
}

const META: Record<
  "google" | "facebook" | "github",
  { label: string; icon: React.ReactNode; bg: string }
> = {
  google: {
    label: "Continue with Google",
    bg: "bg-white text-foreground border border-border hover:bg-muted/60",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917" />
        <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917" />
      </svg>
    ),
  },
  facebook: {
    label: "Continue with Facebook",
    bg: "bg-[#1877F2] text-white hover:bg-[#1465ce]",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.017 1.79-4.685 4.533-4.685c1.313 0 2.686.235 2.686.235v2.965h-1.513c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
      </svg>
    ),
  },
  github: {
    label: "Continue with GitHub",
    bg: "bg-foreground text-background hover:bg-foreground/90",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91c.58.11.79-.25.79-.55v-2.03c-3.2.7-3.87-1.36-3.87-1.36c-.52-1.33-1.27-1.69-1.27-1.69c-1.04-.71.08-.7.08-.7c1.15.08 1.76 1.18 1.76 1.18c1.03 1.77 2.7 1.26 3.36.96c.1-.75.4-1.27.73-1.56c-2.55-.29-5.23-1.28-5.23-5.69c0-1.26.45-2.29 1.18-3.1c-.12-.29-.51-1.46.11-3.05c0 0 .97-.31 3.18 1.19a11 11 0 0 1 5.78 0c2.21-1.5 3.18-1.19 3.18-1.19c.62 1.59.23 2.76.11 3.05c.74.81 1.18 1.84 1.18 3.1c0 4.42-2.69 5.39-5.25 5.68c.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.55c4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    ),
  },
};

export function OAuthButtons({ returnTo = "/community" }: { returnTo?: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["oauth:providers"], queryFn: fetchProviders });
  const providers = data?.providers ?? [];

  if (isLoading) return null;
  if (providers.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center bg-muted/40 rounded-md p-2">
        Social sign-in is being set up. Use email below.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {providers.map((p) => {
        const meta = META[p];
        return (
          <Button
            key={p}
            asChild
            className={`w-full font-medium ${meta.bg}`}
            variant="outline"
          >
            <a href={`/api/auth/${p}/start?returnTo=${encodeURIComponent(returnTo)}`}>
              <span className="mr-2 flex items-center">{meta.icon}</span>
              {meta.label}
            </a>
          </Button>
        );
      })}
    </div>
  );
}
