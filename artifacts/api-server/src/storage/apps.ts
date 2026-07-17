import { eq, and, asc, desc, ilike, sql } from "drizzle-orm";
import {
  db,
  appsTable,
  appCategoriesTable,
  appModulesTable,
  appVotesTable,
  type AppStage,
  type AppAccessType,
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
  voteCount?: number;
  votedByMe?: boolean;
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
  viewerId?: number;
}): Promise<AppSummary[]> {
  const stage = opts.stage ?? "graduated";
  const filters = [eq(appsTable.stage, stage)];
  if (opts.category) filters.push(eq(appCategoriesTable.slug, opts.category));
  if (opts.q) filters.push(ilike(appsTable.name, `%${opts.q}%`));

  // Vote-aware listing (the Incubator surface): include a vote count and, when a
  // viewer is known, whether they voted; rank by votes desc. The Catalog
  // (graduated) keeps its category/name ordering and omits vote fields.
  const withVotes = stage !== "graduated";
  const voteCount = sql<number>`count(${appVotesTable.id})::int`;
  const votedByMe = opts.viewerId
    ? sql<boolean>`bool_or(${appVotesTable.userId} = ${opts.viewerId})`
    : sql<boolean>`false`;

  if (!withVotes) {
    return db
      .select(summaryCols)
      .from(appsTable)
      .innerJoin(appCategoriesTable, eq(appsTable.categoryId, appCategoriesTable.id))
      .where(and(...filters))
      .orderBy(asc(appCategoriesTable.sortOrder), asc(appsTable.name));
  }

  const rows = await db
    .select({ ...summaryCols, voteCount, votedByMe })
    .from(appsTable)
    .innerJoin(appCategoriesTable, eq(appsTable.categoryId, appCategoriesTable.id))
    .leftJoin(appVotesTable, eq(appVotesTable.appId, appsTable.id))
    .where(and(...filters))
    .groupBy(appsTable.id, appCategoriesTable.id)
    .orderBy(desc(voteCount), asc(appsTable.name));
  return rows.map((r) => ({ ...r, voteCount: r.voteCount ?? 0, votedByMe: r.votedByMe ?? false }));
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

export type CreateAppInput = {
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  categoryId: number;
  ownerId: number;
  externalUrl?: string;
  isFirstParty?: boolean;
  stage?: AppStage;
  accessType?: AppAccessType;
};

export async function createApp(input: CreateAppInput): Promise<AppDetail | null> {
  const [row] = await db.insert(appsTable).values(input).returning({ slug: appsTable.slug });
  return row ? getAppBySlug(row.slug) : null;
}

export type UpdateAppInput = Partial<
  Pick<CreateAppInput, "name" | "tagline" | "description" | "categoryId" | "externalUrl" | "stage">
>;

export async function updateApp(id: number, input: UpdateAppInput): Promise<AppDetail | null> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) patch[k] = v;
  }
  const [row] = await db
    .update(appsTable)
    .set(patch)
    .where(eq(appsTable.id, id))
    .returning({ slug: appsTable.slug });
  return row ? getAppBySlug(row.slug) : null;
}

/** Apps are never hard-deleted — comments, ratings and videos will hang off them. */
export async function retireApp(id: number): Promise<void> {
  await db
    .update(appsTable)
    .set({ stage: "retired", updatedAt: new Date() })
    .where(eq(appsTable.id, id));
}
