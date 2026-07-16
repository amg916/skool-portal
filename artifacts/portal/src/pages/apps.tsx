import { useState } from "react";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useListApps } from "@workspace/api-client-react";
import { AppCard } from "@/components/apps/app-card";
import { CategoryRail } from "@/components/apps/category-rail";

export default function AppsPage() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data: apps, isLoading } = useListApps(category ? { category } : undefined);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Apps</h1>
      </div>

      <CategoryRail active={category} onSelect={setCategory} />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !apps?.length ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No apps in this category yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
