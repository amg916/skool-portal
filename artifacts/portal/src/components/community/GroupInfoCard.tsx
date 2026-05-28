import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";

export function GroupInfoCard() {
  const { data: user } = useGetMe();
  const isAdmin = user?.role === "admin";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="h-32 bg-gradient-to-br from-foreground via-foreground/80 to-foreground/60" />
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground text-base">Portal Community</h3>
          <p className="text-xs text-muted-foreground">skool.amgcc.space</p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          A community and learning portal — community, classroom, calendar, members, and
          leaderboards all in one place.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Private community</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <Stat label="Members" value="—" />
          <Stat label="Online" value="—" />
          <Stat label="Admins" value="—" />
        </div>
        {isAdmin ? (
          <Button variant="outline" className="w-full" asChild>
            <a href="/admin">Settings</a>
          </Button>
        ) : (
          <Button variant="outline" className="w-full">
            Invite
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-semibold text-foreground text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
