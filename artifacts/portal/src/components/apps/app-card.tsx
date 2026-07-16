import { Link } from "wouter";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AppSummary } from "@workspace/api-client-react";

export function AppCard({ app }: { app: AppSummary }) {
  return (
    <Link href={`/apps/${app.slug}`}>
      <Card className="group h-full cursor-pointer p-4 transition-colors hover:border-primary/50">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {app.iconUrl ? (
              <img src={app.iconUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium group-hover:text-primary">{app.name}</h3>
              {app.isFirstParty && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  AMG
                </Badge>
              )}
            </div>
            {app.tagline && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{app.tagline}</p>
            )}
            <Badge variant="outline" className="mt-2 text-[10px] capitalize">
              {app.categorySlug}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
