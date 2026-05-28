import { useQuery } from "@tanstack/react-query";
import { Lock, Tag, Users as UsersIcon } from "lucide-react";
import { GroupInfoCard } from "@/components/community/GroupInfoCard";
import { useGroup } from "@/lib/group";

async function fetchMembers(): Promise<{ id: number }[]> {
  const res = await fetch("/api/members", { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AboutPage() {
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: group } = useGroup();
  const count = members?.length ?? 0;
  const name = group?.name ?? "Baingers";
  const description =
    group?.description ??
    "AI banger videos. Under 10 minutes. Watch one, ship something the same day. Members-only community for builders who actually try the stuff.";

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h1 className="text-xl font-bold text-foreground">{name}</h1>

            <div className="mt-6 flex items-center gap-6 flex-wrap text-sm text-muted-foreground">
              <Meta icon={<Lock className="h-4 w-4" />} label="Private" />
              <Meta icon={<UsersIcon className="h-4 w-4" />} label={`${count} members`} />
              <Meta icon={<Tag className="h-4 w-4" />} label="Free" />
            </div>

            <div className="mt-6 text-sm text-foreground/80 leading-relaxed">
              <p>{description}</p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Tile title="Under 10 minutes" body="Every video. No 90-minute lectures." />
              <Tile title="Actually try it" body="Each banger ends with a build challenge." />
              <Tile title="The heat only" body="Curated AI drops, agents, prompts that work." />
            </div>

            <div className="mt-8 text-xs text-muted-foreground">Privacy and terms</div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <GroupInfoCard />
        </aside>
      </div>
    </div>
  );
}

function Meta({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-foreground">{label}</span>
    </div>
  );
}

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-4">
      <div className="font-semibold text-sm text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</div>
    </div>
  );
}
