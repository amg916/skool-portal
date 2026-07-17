import { eq, and, asc, desc, ilike, sql } from "drizzle-orm";
import {
  db,
  appsTable,
  appCategoriesTable,
  appModulesTable,
  appVotesTable,
  appRatingsTable,
  type AppStage,
  type AppAccessType,
} from "@workspace/db";
import { ratingAggregate, listReviews, type AppReview } from "./ratings.js";
import { listAppVideos, type AppVideoView } from "./appVideos.js";
import { getEntitlement } from "./entitlements.js";
import type { AppEntitlement } from "@workspace/db";

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
  avgRating?: number | null;
  ratingCount?: number;
  myRating?: number | null;
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
  reviews?: AppReview[];
  videos?: AppVideoView[];
  myEntitlement?: AppEntitlement | null;
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
    // Catalog: category/name ordering, with the rating aggregate (graduated apps
    // are rated, not voted).
    const rated = await db
      .select({
        ...summaryCols,
        avgRating: sql<number | null>`avg(${appRatingsTable.rating})::float`,
        ratingCount: sql<number>`count(${appRatingsTable.id})::int`,
        myRating: opts.viewerId
          ? sql<number | null>`max(${appRatingsTable.rating}) filter (where ${appRatingsTable.userId} = ${opts.viewerId})`
          : sql<number | null>`null::int`,
      })
      .from(appsTable)
      .innerJoin(appCategoriesTable, eq(appsTable.categoryId, appCategoriesTable.id))
      .leftJoin(appRatingsTable, eq(appRatingsTable.appId, appsTable.id))
      .where(and(...filters))
      .groupBy(appsTable.id, appCategoriesTable.id)
      .orderBy(asc(appCategoriesTable.sortOrder), asc(appsTable.name));
    return rated.map((r) => ({
      ...r,
      avgRating: r.avgRating != null ? Math.round(r.avgRating * 10) / 10 : null,
      ratingCount: r.ratingCount ?? 0,
    }));
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

export async function getAppBySlug(slug: string, viewerId?: number): Promise<AppDetail | null> {
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

  const [votes] = await db
    .select({
      voteCount: sql<number>`count(${appVotesTable.id})::int`,
      votedByMe: viewerId
        ? sql<boolean>`bool_or(${appVotesTable.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(appVotesTable)
    .where(eq(appVotesTable.appId, row.id));

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

  const rating = await ratingAggregate(row.id, viewerId);
  const reviews = row.stage === "graduated" ? await listReviews(row.id) : [];
  const videos = await listAppVideos(row.id);
  // Entitlements only exist for provisioned apps (GHL). link_out apps have none.
  const myEntitlement =
    row.accessType === "provisioned" && viewerId ? await getEntitlement(row.id, viewerId) : null;

  return {
    ...row,
    voteCount: votes?.voteCount ?? 0,
    votedByMe: votes?.votedByMe ?? false,
    ...rating,
    reviews,
    videos,
    myEntitlement,
    modules,
  };
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

/** Detail lookup by id (routes that mutate hold an id, not a slug). */
export async function getAppBySlugById(id: number, viewerId?: number): Promise<AppDetail | null> {
  const [row] = await db.select({ slug: appsTable.slug }).from(appsTable).where(eq(appsTable.id, id));
  return row ? getAppBySlug(row.slug, viewerId) : null;
}
