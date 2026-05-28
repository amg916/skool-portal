import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

type LeaderboardEntry = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  points: number;
};

type LeaderboardResponse = {
  period: "7d" | "30d" | "all";
  entries: LeaderboardEntry[];
};

async function fetchLeaderboard(period: "7d" | "30d" | "all"): Promise<LeaderboardResponse> {
  const res = await fetch(`/api/leaderboards?period=${period}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

const RANK_COLORS = ["bg-amber-400", "bg-zinc-300", "bg-orange-400"];

export function LeaderboardWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", "30d"],
    queryFn: () => fetchLeaderboard("30d"),
  });

  const entries = (data?.entries ?? []).slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm">Leaderboard (30-day)</h3>
        <Link
          href="/leaderboards"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          See all
        </Link>
      </div>
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center flex flex-col items-center gap-2">
          <Trophy className="h-5 w-5 opacity-40" />
          <span>No activity yet</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, idx) => (
            <li key={entry.userId} className="flex items-center gap-3">
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 ${
                  idx < 3 ? RANK_COLORS[idx] : "bg-muted"
                }`}
              >
                {idx + 1}
              </span>
              <UserAvatar
                name={entry.name}
                avatarUrl={entry.avatarUrl}
                className="h-6 w-6"
                fallbackClassName="text-[10px]"
              />
              <span className="flex-1 truncate text-sm text-foreground">{entry.name}</span>
              <span className="text-xs text-muted-foreground font-medium">+{entry.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
