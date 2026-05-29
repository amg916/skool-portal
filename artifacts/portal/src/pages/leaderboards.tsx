import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Lock, HelpCircle, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

type Period = "7d" | "30d" | "all";

type LeaderboardEntry = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  points: number;
};

async function fetchLeaderboard(period: Period): Promise<{ period: Period; entries: LeaderboardEntry[] }> {
  const res = await fetch(`/api/leaderboards?period=${period}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

const RANK_CLASS = ["b-rank-1", "b-rank-2", "b-rank-3"] as const;

function pointsToLevel(points: number): number {
  if (points >= 1000) return 9;
  if (points >= 500) return 8;
  if (points >= 250) return 7;
  if (points >= 150) return 6;
  if (points >= 80) return 5;
  if (points >= 40) return 4;
  if (points >= 20) return 3;
  if (points >= 5) return 2;
  return 1;
}

function nextLevelThreshold(level: number): number {
  return [5, 20, 40, 80, 150, 250, 500, 1000, 1000][level - 1] ?? 1000;
}

export default function LeaderboardsPage() {
  const { data: me } = useGetMe();
  const lb7 = useQuery({ queryKey: ["lb", "7d"], queryFn: () => fetchLeaderboard("7d") });
  const lb30 = useQuery({ queryKey: ["lb", "30d"], queryFn: () => fetchLeaderboard("30d") });
  const lbAll = useQuery({ queryKey: ["lb", "all"], queryFn: () => fetchLeaderboard("all") });

  const myAllTime = lbAll.data?.entries.find((e) => e.userId === me?.id);
  const myPoints = myAllTime?.points ?? 0;
  const myLevel = pointsToLevel(myPoints);
  const next = nextLevelThreshold(myLevel);
  const toGo = Math.max(next - myPoints, 0);

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <UserAvatar
                name={me?.name ?? "?"}
                avatarUrl={(me as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? null}
                className="h-32 w-32"
                fallbackClassName="text-3xl"
              />
              <span className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold border-4 border-card">
                {myLevel}
              </span>
            </div>
            <div className="mt-3 font-semibold text-foreground text-base">{me?.name}</div>
            <div className="text-sm font-medium text-foreground/80">Level {myLevel}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{toGo}</span> points to level up
              </span>
              <HelpCircle className="h-3 w-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => {
              const unlocked = lvl <= myLevel;
              return (
                <div
                  key={lvl}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    unlocked ? "bg-muted/60" : "bg-muted/30"
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      unlocked
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {unlocked ? lvl : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">Level {lvl}</div>
                    <div className="text-xs text-muted-foreground">— of members</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <LeaderboardColumn title="Leaderboard (7-day)" data={lb7.data?.entries} loading={lb7.isLoading} />
        <LeaderboardColumn title="Leaderboard (30-day)" data={lb30.data?.entries} loading={lb30.isLoading} />
        <LeaderboardColumn
          title="Leaderboard (all-time)"
          data={lbAll.data?.entries}
          loading={lbAll.isLoading}
          showTotal
        />
      </div>
    </div>
  );
}

function LeaderboardColumn({
  title,
  data,
  loading,
  showTotal,
}: {
  title: string;
  data?: LeaderboardEntry[];
  loading?: boolean;
  showTotal?: boolean;
}) {
  const entries = (data ?? []).slice(0, 10);
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-foreground text-sm mb-4">{title}</h3>
      {loading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">No activity yet</div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e, idx) => (
            <li key={e.userId} className="flex items-center gap-3">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                  idx < 3 ? RANK_CLASS[idx] : "b-rank-x"
                }`}
              >
                {idx + 1}
              </span>
              <UserAvatar
                name={e.name}
                avatarUrl={e.avatarUrl}
                className="h-7 w-7"
                fallbackClassName="text-[11px]"
              />
              <span className="flex-1 truncate text-sm text-foreground">{e.name}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {showTotal ? e.points : `+${e.points}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
