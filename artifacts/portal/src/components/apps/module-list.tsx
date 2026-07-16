import type { AppModule } from "@workspace/api-client-react";

export function ModuleList({ modules }: { modules: AppModule[] }) {
  // Single-module apps must look intentional, not broken.
  if (!modules.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Includes</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m.id} className="rounded-lg border p-3">
            <div className="font-medium">{m.name}</div>
            {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
