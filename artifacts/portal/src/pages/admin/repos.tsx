import { useQuery } from "@tanstack/react-query";
import { Lock, Globe, Star, GitFork, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type Repo = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  url: string;
  language: string | null;
  stargazers: number;
  forks: number;
  updatedAt: string;
  pushedAt: string;
};

async function fetchRepos(): Promise<Repo[]> {
  const r = await fetch("/api/admin/github-repos", { credentials: "include" });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

export default function AdminReposPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "github-repos"],
    queryFn: fetchRepos,
  });

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-5">My GitHub repos</h1>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 mb-5 text-sm">
          {(error as Error).message}
          <div className="mt-2 text-xs">
            Set <code>GITHUB_ADMIN_TOKEN</code> on the server. A PAT with <code>repo</code> scope is enough.
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map((r) => (
            <li key={r.id} className="bg-card border border-border rounded-xl p-4 hover:border-foreground/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-foreground hover:underline flex items-center gap-1 min-w-0"
                >
                  <span className="truncate">{r.name}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <Badge className={r.isPrivate ? "bg-zinc-200 text-zinc-700" : "bg-emerald-100 text-emerald-700"}>
                  <span className="flex items-center gap-1">
                    {r.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {r.isPrivate ? "Private" : "Public"}
                  </span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {r.description ?? "No description"}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                {r.language && <span className="font-medium text-foreground">{r.language}</span>}
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" /> {r.stargazers}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-3 w-3" /> {r.forks}
                </span>
                <span className="ml-auto text-[11px]">
                  updated {formatDistanceToNow(new Date(r.pushedAt ?? r.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </li>
          ))}
          {(data ?? []).length === 0 && !isLoading && !error && (
            <li className="col-span-full text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
              No repos found.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
