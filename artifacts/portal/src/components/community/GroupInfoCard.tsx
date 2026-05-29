import { Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";
import { useGroup, useMemberCount } from "@/lib/group";
import { InviteButton } from "@/components/community/InviteButton";

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

export function GroupInfoCard() {
  const { data: user } = useGetMe();
  const { data: group } = useGroup();
  const { data: counts } = useMemberCount();
  const isAdmin = user?.role === "admin";

  const name = group?.name ?? "Baingers";
  const slug = group?.slug ?? "baingers.com";
  const description =
    group?.description ??
    "AI bangers, under 10 minutes. Watch one, make something the same day. A members-only community for people who actually try the stuff.";
  const bannerUrl = group?.bannerUrl ?? null;
  const brandInitial = name.charAt(0).toUpperCase();

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {bannerUrl ? (
        <div
          className="h-[130px] bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
      ) : (
        <div className="bc-side-banner">
          <span className="bc-side-logo">{brandInitial}</span>
        </div>
      )}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-extrabold text-foreground text-[1.25rem] tracking-tight leading-tight">
            <BrandName name={name} />
          </h3>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">{slug}</p>
        </div>
        <p className="text-[14px] text-foreground/85 leading-[1.55]">
          {description}
        </p>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground font-semibold">
          <Lock className="h-[15px] w-[15px]" />
          <span>Private community</span>
        </div>
        <div className="bc-found">
          <span className="em" aria-hidden="true">🔥</span>
          <span className="t">
            You're a founding member. The earliest builders shape what this
            becomes.
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 pt-4 mt-2 border-t border-border text-center">
          <Stat label="Members" value={counts ? counts.total.toString() : "—"} />
          <Stat label="Online" value="—" />
          <Stat label="Admins" value={counts ? counts.admins.toString() : "—"} />
        </div>
        <div className="mt-3 space-y-2">
          <InviteButton />
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full rounded-full"
              asChild
            >
              <Link href="/admin/group">Settings</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-extrabold text-foreground text-[1.2rem] tracking-tight tabular-nums">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.05em] font-bold text-muted-foreground/70 mt-0.5">
        {label}
      </div>
    </div>
  );
}
