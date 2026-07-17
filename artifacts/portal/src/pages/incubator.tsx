import { Link } from "wouter";
import { FlaskConical, Loader2, Package } from "lucide-react";
import { useListApps } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoteButton } from "@/components/apps/vote-button";
import { SubmitAppDialog } from "@/components/apps/submit-app-dialog";

export default function IncubatorPage() {
  const { data: apps, isLoading } = useListApps({ stage: "incubating" });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Incubator</h1>
        </div>
        <SubmitAppDialog />
      </div>
      <p className="text-sm text-muted-foreground">
        Community-submitted apps. Vote for the ones you want promoted into the catalog.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !apps?.length ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          Nothing in the Incubator yet. Be the first to submit an app.
        </div>
      ) : (
        <ul className="space-y-3">
          {apps.map((app) => (
            <li key={app.id}>
              <Card className="flex items-center gap-4 p-4">
                <VoteButton appId={app.id} voteCount={app.voteCount ?? 0} votedByMe={app.votedByMe ?? false} />
                <Link href={`/apps/${app.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {app.iconUrl ? (
                      <img src={app.iconUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{app.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {app.categorySlug}
                      </Badge>
                    </div>
                    {app.tagline && (
                      <p className="truncate text-sm text-muted-foreground">{app.tagline}</p>
                    )}
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
