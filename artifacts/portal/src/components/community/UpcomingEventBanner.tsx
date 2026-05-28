import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

type EventRow = {
  id: number;
  title: string;
  startsAt: string;
};

async function fetchNextEvent(): Promise<EventRow | null> {
  const now = new Date();
  const to = new Date();
  to.setDate(now.getDate() + 30);
  const u = new URL("/api/events", window.location.origin);
  u.searchParams.set("from", now.toISOString());
  u.searchParams.set("to", to.toISOString());
  const r = await fetch(u.toString(), { credentials: "include" });
  if (!r.ok) return null;
  const list: EventRow[] = await r.json();
  return list[0] ?? null;
}

export function UpcomingEventBanner() {
  const { data } = useQuery({ queryKey: ["next-event"], queryFn: fetchNextEvent });
  if (!data) return null;
  const when = formatDistanceToNow(new Date(data.startsAt), { addSuffix: true });
  return (
    <Link href="/calendar">
      <div className="flex items-center justify-center gap-2 text-sm text-foreground hover:text-foreground/80 cursor-pointer py-1">
        <CalendarIcon className="h-4 w-4" aria-hidden="true" />
        <span>
          <span className="font-semibold">{data.title}</span>
          <span className="text-muted-foreground"> is happening {when}</span>
        </span>
      </div>
    </Link>
  );
}
