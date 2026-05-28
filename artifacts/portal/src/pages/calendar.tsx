import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { GroupInfoCard } from "@/components/community/GroupInfoCard";
import { Calendar as CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type EventRow = {
  id: number;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
};

async function fetchEvents(from: Date, to: Date): Promise<EventRow[]> {
  const u = new URL("/api/events", window.location.origin);
  u.searchParams.set("from", from.toISOString());
  u.searchParams.set("to", to.toISOString());
  const res = await fetch(u.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}

async function createEvent(body: {
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
}): Promise<EventRow> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteEvent(id: number) {
  const res = await fetch(`/api/events/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
}

export default function CalendarPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const { data: user } = useGetMe();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthStart = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor],
  );
  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59),
    [cursor],
  );
  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();
  const monthLabel = monthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

  const { data: events = [] } = useQuery({
    queryKey: ["events", cursor.getFullYear(), cursor.getMonth()],
    queryFn: () => fetchEvents(monthStart, monthEnd),
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<number, EventRow[]>();
    for (const e of events) {
      const d = new Date(e.startsAt);
      if (
        d.getFullYear() === cursor.getFullYear() &&
        d.getMonth() === cursor.getMonth()
      ) {
        const arr = map.get(d.getDate()) ?? [];
        arr.push(e);
        map.set(d.getDate(), arr);
      }
    }
    return map;
  }, [events, cursor]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStart, setNewStart] = useState("");

  const createMut = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewStart("");
      toast({ title: "Event created" });
    },
    onError: (e) =>
      toast({
        title: "Couldn't create event",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Event deleted" });
    },
  });

  const openCreateForDay = (day: number | null) => {
    const target = day
      ? new Date(cursor.getFullYear(), cursor.getMonth(), day, 10, 0, 0)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);
    setDefaultDate(toLocalInputValue(target));
    setNewStart(toLocalInputValue(target));
    setCreateOpen(true);
  };

  const selectedDayEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
                aria-label="Previous month"
              >
                ‹
              </Button>
              <h1 className="text-xl font-semibold text-foreground">{monthLabel}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
                aria-label="Next month"
              >
                ›
              </Button>
            </div>
            {isAdmin && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => openCreateForDay(null)}>
                    <Plus className="h-4 w-4 mr-1.5" /> New event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New event</DialogTitle>
                    <DialogDescription>Visible to all community members.</DialogDescription>
                  </DialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTitle.trim() || !newStart) return;
                      createMut.mutate({
                        title: newTitle.trim(),
                        description: newDescription.trim() || undefined,
                        startsAt: new Date(newStart).toISOString(),
                      });
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="event-title">Title</Label>
                      <Input
                        id="event-title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Weekly Q&A call"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-start">Starts at</Label>
                      <Input
                        id="event-start"
                        type="datetime-local"
                        value={newStart || defaultDate}
                        onChange={(e) => setNewStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-desc">Description (optional)</Label>
                      <Textarea
                        id="event-desc"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createMut.isPending}>
                        {createMut.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Create
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-7 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-1 py-1.5 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isToday =
                  day === today.getDate() &&
                  cursor.getMonth() === today.getMonth() &&
                  cursor.getFullYear() === today.getFullYear();
                const dayEvents = eventsByDay.get(day) ?? [];
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    onDoubleClick={() => isAdmin && openCreateForDay(day)}
                    aria-label={`Day ${day}, ${dayEvents.length} events`}
                    className={`aspect-square rounded-md border text-left text-sm flex flex-col p-1.5 transition-colors ${
                      isToday
                        ? "bg-foreground text-background border-foreground font-semibold"
                        : isSelected
                          ? "bg-muted border-foreground/40"
                          : "border-border text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="mt-auto space-y-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className={`text-[10px] truncate rounded px-1 ${
                              isToday
                                ? "bg-background/30 text-background"
                                : "bg-accent/30 text-foreground"
                            }`}
                          >
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-3">
              {selectedDay
                ? `Events on ${monthStart.toLocaleString("en-US", { month: "long" })} ${selectedDay}`
                : "Upcoming events"}
            </h3>
            {(selectedDay ? selectedDayEvents : events).length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
                <CalendarIcon className="h-5 w-5 opacity-40" />
                No events {selectedDay ? "on this day" : "scheduled yet"}.
              </div>
            ) : (
              <ul className="space-y-3">
                {(selectedDay ? selectedDayEvents : events).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{e.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(e.startsAt), "EEE, MMM d · h:mm a")}
                        {e.createdByName && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>by {e.createdByName}</span>
                          </>
                        )}
                      </div>
                      {e.description && (
                        <div className="text-sm text-foreground/80 mt-1.5">
                          {e.description}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMut.mutate(e.id)}
                        aria-label="Delete event"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <GroupInfoCard />
        </aside>
      </div>
    </div>
  );
}

function toLocalInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
