import { GroupInfoCard } from "@/components/community/GroupInfoCard";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const today = now.getDate();

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">{monthLabel}</h1>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> New event
            </Button>
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
                const isToday = day === today;
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-md border ${
                      isToday
                        ? "bg-foreground text-background border-foreground font-semibold"
                        : "border-border text-foreground hover:bg-muted/60 cursor-pointer"
                    } flex items-start justify-start p-2 text-sm`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-2">Upcoming events</h3>
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
              <CalendarIcon className="h-5 w-5 opacity-40" />
              No events scheduled yet.
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <GroupInfoCard />
        </aside>
      </div>
    </div>
  );
}
