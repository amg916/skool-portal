import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, GraduationCap, Loader2, Package, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetApp, useGetMe, useSetAppStage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleList } from "@/components/apps/module-list";
import { VoteButton } from "@/components/apps/vote-button";
import { RatingPanel } from "@/components/apps/rating-panel";
import { AppVideos } from "@/components/apps/app-videos";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";

export default function AppDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: app, isLoading, isError } = useGetApp(slug);
  const { data: me } = useGetMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const setStage = useSetAppStage({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries();
        toast({ title: "Updated" });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !app) return <NotFound />;

  const isAdmin = me?.role === "admin";
  const isGraduated = app.stage === "graduated";
  const inIncubator = app.stage === "submitted" || app.stage === "incubating";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Link href={inIncubator ? "/incubator" : "/apps"}>
        <Button variant="ghost" size="sm" className="-ml-2 gap-1">
          <ArrowLeft className="h-4 w-4" />
          {inIncubator ? "Incubator" : "All apps"}
        </Button>
      </Link>

      <div className="flex items-start gap-4">
        {inIncubator && (
          <VoteButton appId={app.id} voteCount={app.voteCount ?? 0} votedByMe={app.votedByMe ?? false} />
        )}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {app.iconUrl ? (
            <img src={app.iconUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{app.name}</h1>
            {app.isFirstParty && <Badge variant="secondary">AMG</Badge>}
            <Badge variant="outline" className="capitalize">
              {app.categorySlug}
            </Badge>
            {inIncubator && (
              <Badge variant="outline" className="capitalize text-amber-600">
                {app.stage}
              </Badge>
            )}
          </div>
          {app.tagline && <p className="mt-1 text-muted-foreground">{app.tagline}</p>}
        </div>
      </div>

      {/* CTA is hidden until a real URL exists — an unfilled entry must not ship a dead link. */}
      {app.externalUrl && (
        <Button asChild size="lg" className="gap-2">
          <a href={app.externalUrl} target="_blank" rel="noopener noreferrer">
            Open {app.name}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}

      {/* Admin moderation: promote through the Incubator, or reject. */}
      {isAdmin && !isGraduated && app.stage !== "rejected" && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-dashed p-3">
          <span className="mr-auto self-center text-sm text-muted-foreground">Admin</span>
          {app.stage === "submitted" && (
            <Button
              size="sm"
              variant="outline"
              disabled={setStage.isPending}
              onClick={() => setStage.mutate({ id: app.id, data: { stage: "incubating" } })}
            >
              Approve into Incubator
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1"
            disabled={setStage.isPending}
            onClick={() => setStage.mutate({ id: app.id, data: { stage: "graduated" } })}
          >
            <GraduationCap className="h-4 w-4" />
            Graduate to catalog
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={setStage.isPending}
            onClick={() => setStage.mutate({ id: app.id, data: { stage: "rejected" } })}
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      )}

      {app.description && <p className="whitespace-pre-wrap leading-relaxed">{app.description}</p>}

      <AppVideos appId={app.id} videos={app.videos ?? []} isAdmin={isAdmin} />

      {/* Ratings are catalog-only — incubator apps are voted on, not rated. */}
      {isGraduated && (
        <RatingPanel
          appId={app.id}
          avgRating={app.avgRating ?? null}
          ratingCount={app.ratingCount ?? 0}
          myRating={app.myRating ?? null}
          reviews={app.reviews ?? []}
        />
      )}

      <ModuleList modules={app.modules ?? []} />

      {!!app.screenshots?.length && (
        <div className="grid gap-3 sm:grid-cols-2">
          {app.screenshots.map((src) => (
            <img key={src} src={src} alt="" className="rounded-lg border" />
          ))}
        </div>
      )}
    </div>
  );
}
