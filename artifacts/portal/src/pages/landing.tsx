import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  PlayCircle,
  Clock,
  Wand2,
  Hammer,
  Users,
  ShieldCheck,
  Flame,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useGroup } from "@/lib/group";

type ProvidersResponse = { providers: Array<"google" | "facebook" | "github"> };

async function fetchProviders(): Promise<ProvidersResponse> {
  const r = await fetch("/api/auth/providers", { credentials: "include" });
  if (!r.ok) return { providers: [] };
  return r.json();
}

const FEATURES = [
  {
    icon: Clock,
    title: "Under 10 minutes",
    body: "Every video hits the point fast. No 90-minute lectures. No filler. Watch on a coffee break, ship before lunch.",
  },
  {
    icon: Hammer,
    title: "Actually try it",
    body: "Each banger ends with a tight build challenge you can do today. The community ships the work in public.",
  },
  {
    icon: Wand2,
    title: "The best of new AI",
    body: "Hand-picked drops, model releases, agent breakdowns, prompt patterns that work in production right now.",
  },
  {
    icon: Users,
    title: "Builders, not lurkers",
    body: "Members are people shipping with AI. Founders, engineers, designers, hobbyists. Trade techniques, not opinions.",
  },
];

const BANGERS = [
  {
    title: "Spin up a one-shot Claude agent that books your meetings — 8 min",
    pill: "Agents",
  },
  {
    title: "The 3-prompt pattern that fixed our RAG recall — 6 min",
    pill: "RAG",
  },
  {
    title: "Cursor → Vercel in 9 minutes: ship a working SaaS landing today",
    pill: "Tools",
  },
  {
    title: "Cheap voice agent with Twilio + Deepgram + Sonnet (under 10 min)",
    pill: "Voice",
  },
];

const HOW = [
  "Watch the banger — average 7 minutes.",
  "Ship the build challenge — usually same day.",
  "Post what you made — community gives feedback.",
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });
  const { data: group } = useGroup();
  const { data: providers } = useQuery({
    queryKey: ["oauth:providers"],
    queryFn: fetchProviders,
  });

  useEffect(() => {
    if (!isLoading && user) setLocation("/community");
  }, [user, isLoading, setLocation]);

  const googleEnabled = providers?.providers.includes("google") ?? false;
  const groupName = group?.name ?? "Baingers";
  const groupIcon = group?.iconUrl ?? null;
  const signupHref = googleEnabled ? "/api/auth/google/start?returnTo=/community" : "/login";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur z-40">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {groupIcon ? (
              <img src={groupIcon} alt={groupName} className="h-9 w-9 rounded-lg" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center font-extrabold">
                B
              </div>
            )}
            <span className="font-bold text-lg">{groupName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
              <a href={signupHref}>Join with Google <ArrowRight className="h-4 w-4 ml-1" /></a>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #3B82F6 0px, transparent 40%), radial-gradient(circle at 80% 0%, #EC4899 0px, transparent 40%), radial-gradient(circle at 50% 100%, #F59E0B 0px, transparent 40%)",
          }}
        />
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/70 mb-6">
              <Flame className="h-3.5 w-3.5 text-accent" />
              The only AI community where the videos are short
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              AI bangers.{" "}
              <span className="bg-gradient-to-r from-blue-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                Under 10 min.
              </span>{" "}
              Ship today.
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mt-7 max-w-2xl mx-auto leading-relaxed">
              Every video on Baingers is a tight, actionable AI build. Watch one
              over coffee. Ship something before lunch. Join the builders trying
              the heat — not just talking about it.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 px-8 text-base"
              >
                <a href={signupHref}>
                  Join with Google
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8 text-base">
                <Link href="/login">I have an account</Link>
              </Button>
            </div>
            <div className="mt-5 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Members-only. Google sign-in. We never store a password.
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {BANGERS.map((b) => (
              <div
                key={b.title}
                className="bg-card border border-border rounded-xl p-4 hover:border-foreground/30 transition-colors group cursor-default"
              >
                <div className="flex items-center justify-between mb-2">
                  <PlayCircle className="h-5 w-5 text-accent" />
                  <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    {b.pill}
                  </span>
                </div>
                <div className="text-sm font-medium leading-snug text-foreground line-clamp-3">
                  {b.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              No 90-minute lectures. No hot-take threads.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Just sharp clips you can act on the same day you watch them.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-2xl p-7 hover:border-foreground/20 transition-colors"
              >
                <div className="h-11 w-11 rounded-xl bg-foreground text-background flex items-center justify-center mb-5">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-xl text-foreground mb-2">{f.title}</h3>
                <p className="text-foreground/70 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                The Baingers loop
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Why members ship more in a week here than they did all last
                quarter.
              </p>
              <ul className="mt-8 space-y-4">
                {HOW.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="pt-1 text-foreground text-lg leading-snug">{step}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
                What members shipped last week
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  "An invoice-OCR pipeline that paid for itself by Friday",
                  "Auto-generated SOC2 evidence with a 4-prompt agent",
                  "A Slack bot that triages bug reports from screenshots",
                  "A Cursor MCP server that pulls live prod logs",
                  "Daily AI-news brief delivered to 1,200 of their subscribers",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-foreground/85">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-24 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Stop saving "for later".
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              Watch one. Build one. Today.
            </span>
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl mx-auto">
            Members-only. Free to join. Google sign-in keeps the bots out.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-9 bg-foreground text-background hover:bg-foreground/90 px-10 text-base"
          >
            <a href={signupHref}>
              Join with Google
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {groupIcon ? (
              <img src={groupIcon} alt={groupName} className="h-6 w-6 rounded" />
            ) : (
              <div className="h-6 w-6 rounded bg-foreground text-background flex items-center justify-center font-bold text-[10px]">
                B
              </div>
            )}
            <span>
              {groupName} · {group?.slug ?? "baingers.com"}
            </span>
          </div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
