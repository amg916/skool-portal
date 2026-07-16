import { eq, and, asc, ilike } from "drizzle-orm";
import {
  db,
  appsTable,
  appCategoriesTable,
  appModulesTable,
  type AppStage,
} from "@workspace/db";

export type AppSummary = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  categoryId: number;
  categorySlug: string;
  iconUrl: string | null;
  stage: string;
  accessType: string;
  isFirstParty: boolean;
};

export type AppModuleView = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type AppDetail = AppSummary & {
  description: string | null;
  externalUrl: string | null;
  screenshots: string[];
  modules: AppModuleView[];
};

const summaryCols = {
  id: appsTable.id,
  slug: appsTable.slug,
  name: appsTable.name,
  tagline: appsTable.tagline,
  categoryId: appsTable.categoryId,
  categorySlug: appCategoriesTable.slug,
  iconUrl: appsTable.iconUrl,
  stage: appsTable.stage,
  accessType: appsTable.accessType,
  isFirstParty: appsTable.isFirstParty,
};

export async function listApps(opts: {
  category?: string;
  stage?: AppStage;
  q?: string;
}): Promise<AppSummary[]> {
  const filters = [eq(appsTable.stage, opts.stage ?? "graduated")];
  if (opts.category) filters.push(eq(appCategoriesTable.slug, opts.category));
  if (opts.q) filters.push(ilike(appsTable.name, `%${opts.q}%`));

  return db
    .select(summaryCols)
    .from(appsTable)
    .innerJoin(appCategoriesTable, eq(appsTable.categoryId, appCategoriesTable.id))
    .where(and(...filters))
    .orderBy(asc(appCategoriesTable.sortOrder), asc(appsTable.name));
}

export async function getAppBySlug(slug: string): Promise<AppDetail | null> {
  const [row] = await db
    .select({
      ...summaryCols,
      description: appsTable.description,
      externalUrl: appsTable.externalUrl,
      screenshots: appsTable.screenshots,
    })
    .from(appsTable)
    .innerJoin(appCategoriesTable, eq(appsTable.categoryId, appCategoriesTable.id))
    .where(eq(appsTable.slug, slug));

  if (!row) return null;

  const modules = await db
    .select({
      id: appModulesTable.id,
      name: appModulesTable.name,
      description: appModulesTable.description,
      sortOrder: appModulesTable.sortOrder,
    })
    .from(appModulesTable)
    .where(eq(appModulesTable.appId, row.id))
    .orderBy(asc(appModulesTable.sortOrder));

  return { ...row, modules };
}

/** Apps are never hard-deleted — comments, ratings and videos will hang off them. */
export async function retireApp(id: number): Promise<void> {
  await db
    .update(appsTable)
    .set({ stage: "retired", updatedAt: new Date() })
    .where(eq(appsTable.id, id));
}
