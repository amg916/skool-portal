import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Flame, Sparkles, Users, Trophy, Calendar as CalendarIcon, BookOpen } from "lucide-react";

const FEATURES = [
  {
    icon: Flame,
    title: "Banger feed",
    body: "The hottest AI clips, breakdowns and reactions — curated daily. No filler.",
  },
  {
    icon: BookOpen,
    title: "Classroom",
    body: "Structured courses on building with the latest models, agents, and tools.",
  },
  {
    icon: Users,
    title: "Members",
    body: "Connect with engineers, founders, and hobbyists shipping with AI right now.",
  },
  {
    icon: CalendarIcon,
    title: "Live events",
    body: "Weekly community calls, model launches, and watch parties on the calendar.",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    body: "Earn points for sharing bangers and helping. Climb the 9-level ladder.",
  },
  {
    icon: Sparkles,
    title: "Made for the heat",
    body: "Built specifically for the high-signal AI community. Bring your sharpest takes.",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/community");
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center font-extrabold">
              B
            </div>
            <span className="font-bold text-lg">Baingers</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/signup">Join free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Flame className="h-3.5 w-3.5 text-accent" /> Only the absolute heat in AI
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            AI <span className="text-accent">bangers</span>. Every day.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto">
            Baingers is the community for the highest-signal AI content — clips,
            breakdowns, drops, and the people shipping it. Join the heat.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
              <Link href="/signup">Join the community — free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <div className="mt-6 text-xs text-muted-foreground">
            Continue with Google · Facebook · GitHub · or email
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12">
            Everything you'd want in an AI community
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-foreground/20 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to post your first banger?
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Sign up in 10 seconds. Free, private community.
          </p>
          <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 px-10">
            <Link href="/signup">Join free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-foreground text-background flex items-center justify-center font-bold text-[10px]">
              B
            </div>
            <span>Baingers · baingers.com</span>
          </div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/signup" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
