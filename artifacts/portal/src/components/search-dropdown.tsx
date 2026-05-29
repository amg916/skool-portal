import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MessageSquare,
  User as UserIcon,
  BookOpen,
  Video as VideoIcon,
} from "lucide-react";
import { Link } from "wouter";
import { UserAvatar } from "@/components/user-avatar";

type SearchResults = {
  posts: Array<{
    id: number;
    channelId: number;
    channelName: string | null;
    body: string;
    snippet: string;
    authorName: string | null;
    transcriptMatch?: boolean;
  }>;
  members: Array<{
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: "admin" | "member";
  }>;
  lessons: Array<{ id: number; title: string; subsectionId: number }>;
};

async function search(q: string): Promise<SearchResults> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export function SearchDropdown() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debouncedQ = useDebounced(q, 200);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () => search(debouncedQ),
    enabled: debouncedQ.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const hasResults =
    !!data && (data.posts.length + data.members.length + data.lessons.length) > 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={q}
        placeholder="Search posts, members, lessons"
        aria-label="Search"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-full h-10 pl-9 pr-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
      />
      {open && debouncedQ.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 bg-card border border-border rounded-xl shadow-lg max-h-[480px] overflow-y-auto">
          {isFetching && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}
          {!isFetching && !hasResults && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No results for “{debouncedQ}”.
            </div>
          )}
          {hasResults && (
            <div className="py-1">
              {data!.posts.length > 0 && (
                <Section title="Posts">
                  {data!.posts.map((p) => (
                    <Link
                      key={`p-${p.id}`}
                      href={`/community/${p.channelId}`}
                      onClick={() => setOpen(false)}
                    >
                      <ResultRow
                        icon={
                          p.transcriptMatch ? (
                            <VideoIcon className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )
                        }
                        title={
                          p.transcriptMatch
                            ? `🎙 ${p.snippet}`
                            : p.snippet
                        }
                        sub={`${p.authorName ?? "Unknown"} · ${p.channelName ?? ""}${
                          p.transcriptMatch ? " · transcript" : ""
                        }`}
                      />
                    </Link>
                  ))}
                </Section>
              )}
              {data!.members.length > 0 && (
                <Section title="Members">
                  {data!.members.map((m) => (
                    <Link
                      key={`m-${m.id}`}
                      href="/members"
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/60 transition-colors cursor-pointer">
                        <UserAvatar
                          name={m.name}
                          avatarUrl={m.avatarUrl}
                          className="h-7 w-7"
                          fallbackClassName="text-[10px]"
                        />
                        <div className="min-w-0">
                          <div className="text-sm text-foreground font-medium truncate">
                            {m.name}
                            {m.role === "admin" && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide bg-foreground text-background px-1 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </Section>
              )}
              {data!.lessons.length > 0 && (
                <Section title="Lessons">
                  {data!.lessons.map((l) => (
                    <Link
                      key={`l-${l.id}`}
                      href={`/school/lessons/${l.id}`}
                      onClick={() => setOpen(false)}
                    >
                      <ResultRow icon={<BookOpen className="h-4 w-4" />} title={l.title} />
                    </Link>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-2 hover:bg-muted/60 transition-colors cursor-pointer">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground line-clamp-2">{title}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
