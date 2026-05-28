import { useQuery } from "@tanstack/react-query";
import { Lock, Tag, Users as UsersIcon } from "lucide-react";
import { GroupInfoCard } from "@/components/community/GroupInfoCard";

async function fetchMembers(): Promise<{ id: number }[]> {
  const res = await fetch("/api/members", { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AboutPage() {
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const count = members?.length ?? 0;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h1 className="text-xl font-bold text-foreground">Portal Community</h1>

            <div className="mt-6 flex items-center gap-6 flex-wrap text-sm text-muted-foreground">
              <Meta icon={<Lock className="h-4 w-4" />} label="Private" />
              <Meta icon={<UsersIcon className="h-4 w-4" />} label={`${count} members`} />
              <Meta icon={<Tag className="h-4 w-4" />} label="Free" />
            </div>

            <div className="mt-6 text-sm text-foreground/80 leading-relaxed">
              <p>
                A full-stack community and learning portal — community feed, classroom courses,
                calendar, members, and leaderboards all in one place. Built with React, Express, and
                PostgreSQL.
              </p>
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
