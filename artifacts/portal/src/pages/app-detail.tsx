import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, Loader2, Package } from "lucide-react";
import { useGetApp } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleList } from "@/components/apps/module-list";
import NotFound from "@/pages/not-found";

export default function AppDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: app, isLoading, isError } = useGetApp(slug);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !app) return <NotFound />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Link href="/apps">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1">
          <ArrowLeft className="h-4 w-4" />
          All apps
        </Button>
      </Link>

      <div className="flex items-start gap-4">
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
          </div>
          {app.tagline && <p className="mt-1 text-muted-foreground">{app.tagline}</p>}
        </div>
      </div>

      {/* CTA is hidden until a real URL exists — an unfilled catalog entry must
          not ship a dead link. */}
      {app.externalUrl && (
        <Button asChild size="lg" className="gap-2">
          <a href={app.externalUrl} target="_blank" rel="noopener noreferrer">
            Open {app.name}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}

      {app.description && (
        <p className="whitespace-pre-wrap leading-relaxed">{app.description}</p>
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
