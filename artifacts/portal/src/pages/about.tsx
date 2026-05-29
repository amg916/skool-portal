import { useQuery } from "@tanstack/react-query";
import { Lock, Tag, Users as UsersIcon } from "lucide-react";
import { GroupInfoCard } from "@/components/community/GroupInfoCard";
import { useGroup } from "@/lib/group";

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

async function fetchMembers(): Promise<{ id: number }[]> {
  const res = await fetch("/api/members", { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AboutPage() {
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });
  const { data: group } = useGroup();
  const count = members?.length ?? 0;
  const name = group?.name ?? "Baingers";
  const description =
    group?.description ??
    "AI banger videos. Under 10 minutes. Watch one, make something the same day. Members-only community for builders who actually try the stuff.";

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="min-w-0 space-y-6">
          <div className="b-hero-panel px-7 py-8 sm:px-9 sm:py-10">
            <span className="b-badge">
              <span className="dot" />
              About the community
            </span>
            <h1 className="text-white text-[2rem] sm:text-[2.4rem] font-extrabold tracking-tight mt-4 leading-[1.08]">
              <BrandName name={name} />
            </h1>
            <p className="text-white/75 text-base mt-3 max-w-[58ch] leading-relaxed">
              {description}
            </p>
            <div className="mt-6 flex items-center gap-6 flex-wrap text-[13px] text-white/80 font-semibold">
              <Meta icon={<Lock className="h-[15px] w-[15px]" />} label="Private" />
              <Meta
                icon={<UsersIcon className="h-[15px] w-[15px]" />}
                label={`${count} ${count === 1 ? "member" : "members"}`}
              />
              <Meta icon={<Tag className="h-[15px] w-[15px]" />} label="Free during beta" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Tile
              icon="⏱"
              title="Under 10 minutes"
              body="Every video runs short. No 90-minute lectures. Press play, follow along."
              accent="blue"
            />
            <Tile
              icon="🛠"
              title="Actually try it"
              body="Each banger ends with a build challenge you can replicate the same day."
              accent="purple"
            />
            <Tile
              icon="🔥"
              title="The heat only"
              body="Curated AI drops, agents, and prompt patterns that work in production."
              accent="orange"
            />
          </div>

          <div className="b-found">
            <span className="em" aria-hidden="true">🔥</span>
            <span className="t">
              You're early. Founding members shape what this community becomes — bring
              your taste, build in public, and the rest catches up.
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-foreground text-base">Why members join</h3>
            <ul className="mt-4 space-y-3 text-[14.5px] text-foreground/85 leading-relaxed">
              <li className="flex gap-3">
                <span className="text-[var(--b-blue)]">▶</span>
                <span>
                  <b>Short, do-it-today AI walkthroughs.</b> No filler. Every banger
                  shows you the working result in under 10 minutes.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--b-purple)]">🔧</span>
                <span>
                  <b>"I made this" badge on comments.</b> Mark a comment as I made
                  this to earn a green badge that counts 2× on the leaderboard.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--b-orange)]">📅</span>
                <span>
                  <b>Weekly Q&A call.</b> Founders + members on one shared schedule.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--b-green)]">✅</span>
                <span>
                  <b>Single-tap Google sign-in.</b> No password, no friction,
                  bot-free.
                </span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground px-2">
            <a href="/terms" className="hover:underline">
              Terms
            </a>{" "}
            ·{" "}
            <a href="/privacy" className="hover:underline">
              Privacy
            </a>{" "}
            ·{" "}
            <a href="mailto:hello@baingers.com" className="hover:underline">
              Contact
            </a>
          </p>
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
      <span>{label}</span>
    </div>
  );
}

const TILE_ACCENT: Record<string, string> = {
  blue: "var(--b-blue)",
  purple: "var(--b-purple)",
  orange: "var(--b-orange)",
};

function Tile({
  icon,
  title,
  body,
  accent,
}: {
  icon: string;
  title: string;
  body: string;
  accent: "blue" | "purple" | "orange";
}) {
  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderTopColor: TILE_ACCENT[accent], borderTopWidth: 3 }}
    >
      <div className="text-2xl leading-none" aria-hidden="true">
        {icon}
      </div>
      <div className="mt-3 font-bold text-foreground text-[1.02rem]">{title}</div>
      <div className="text-[13.5px] text-muted-foreground mt-1.5 leading-[1.5]">
        {body}
      </div>
    </div>
  );
}
