import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { useGetMe } from "@workspace/api-client-react";

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

async function fetchLeaderboard(
  period: "7d" | "30d" | "all",
): Promise<LeaderboardResponse> {
  const res = await fetch(`/api/leaderboards?period=${period}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

const RANK_CLASS = ["bc-rank-1", "bc-rank-2", "bc-rank-3"] as const;

function BrandName({ name }: { name: string }) {
  const idx = name.toLowerCase().indexOf("ai");
  if (idx < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <span className="ai-txt">{name.slice(idx, idx + 2)}</span>
      {name.slice(idx + 2)}
    </>
  );
}

export function LeaderboardWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", "30d"],
    queryFn: () => fetchLeaderboard("30d"),
  });
  const { data: me } = useGetMe();

  const entries = (data?.entries ?? []).slice(0, 5);

  return (
    <>
      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h3 className="font-extrabold text-foreground text-[1.05rem] tracking-tight">
            Leaderboard (30-day)
          </h3>
          <Link
            href="/leaderboards"
            className="text-[13px] font-bold text-[var(--b-blue,#2F6BFF)] hover:underline"
          >
            See all
          </Link>
        </div>
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center">
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center flex flex-col items-center gap-2">
            <Trophy className="h-5 w-5 opacity-40" />
            <span>No activity yet</span>
          </div>
        ) : (
          <ul className="px-3 pt-2 pb-4 flex flex-col">
            {entries.map((entry, idx) => {
              const isYou = me?.id === entry.userId;
              const rankClass = idx < 3 ? RANK_CLASS[idx] : "bc-rank-x";
              return (
                <li
                  key={entry.userId}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <span
                    className={`h-[22px] w-[22px] rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${rankClass}`}
                  >
                    {idx + 1}
                  </span>
                  <UserAvatar
                    name={entry.name}
                    avatarUrl={entry.avatarUrl}
                    className="h-[30px] w-[30px]"
                    fallbackClassName="text-[12px]"
                  />
                  <span
                    className={`flex-1 truncate text-[14px] font-bold ${
                      isYou ? "text-[var(--b-blue,#2F6BFF)]" : "text-foreground"
                    }`}
                  >
                    <BrandName name={entry.name} />
                  </span>
                  <span
                    className={`font-mono font-bold text-[13px] ${
                      entry.points === 0 ? "bc-pts-zero" : "text-foreground/85"
                    }`}
                  >
                    {entry.points === 0 ? "0" : `+${entry.points}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="bc-side-hint">
        Points: posts +3 · comments +1 · "I made this" +3
      </p>
    </>
  );
}
