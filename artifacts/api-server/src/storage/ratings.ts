import { eq, and, desc, sql } from "drizzle-orm";
import { db, appsTable, appRatingsTable, usersTable } from "@workspace/db";

export type RatingAggregate = {
  avgRating: number | null;
  ratingCount: number;
  myRating: number | null;
};

export type AppReview = {
  id: number;
  rating: number;
  review: string | null;
  userName: string;
  userAvatarUrl: string | null;
  createdAt: Date;
};

/** Aggregate for one app, optionally including the viewer's own rating. */
export async function ratingAggregate(appId: number, viewerId?: number): Promise<RatingAggregate> {
  const [agg] = await db
    .select({
      avg: sql<number | null>`avg(${appRatingsTable.rating})::float`,
      count: sql<number>`count(*)::int`,
      mine: viewerId
        ? sql<number | null>`max(${appRatingsTable.rating}) filter (where ${appRatingsTable.userId} = ${viewerId})`
        : sql<number | null>`null::int`,
    })
    .from(appRatingsTable)
    .where(eq(appRatingsTable.appId, appId));

  return {
    // round to 1dp so the UI doesn't render 4.333333
    avgRating: agg?.avg != null ? Math.round(agg.avg * 10) / 10 : null,
    ratingCount: agg?.count ?? 0,
    myRating: agg?.mine ?? null,
  };
}

/**
 * Upsert a rating. Catalog-only: an app must be graduated to be rateable —
 * incubator apps are VOTED on, not rated. One rating per user per app.
 */
export async function rateApp(
  appId: number,
  userId: number,
  input: { rating: number; review?: string },
): Promise<RatingAggregate> {
  const [app] = await db.select({ stage: appsTable.stage }).from(appsTable).where(eq(appsTable.id, appId));
  if (!app) throw new Error("app not found");
  if (app.stage !== "graduated") throw new Error("app is not rateable — only graduated apps can be rated");

  await db
    .insert(appRatingsTable)
    .values({ appId, userId, rating: input.rating, review: input.review ?? null })
    .onConflictDoUpdate({
      target: [appRatingsTable.appId, appRatingsTable.userId],
      set: { rating: input.rating, review: input.review ?? null, updatedAt: new Date() },
    });

  return ratingAggregate(appId, userId);
}

export async function unrateApp(appId: number, userId: number): Promise<RatingAggregate> {
  await db
    .delete(appRatingsTable)
    .where(and(eq(appRatingsTable.appId, appId), eq(appRatingsTable.userId, userId)));
  return ratingAggregate(appId, userId);
}

/** Reviews = ratings that carry text. A bare star has nothing to display. */
export async function listReviews(appId: number): Promise<AppReview[]> {
  return db
    .select({
      id: appRatingsTable.id,
      rating: appRatingsTable.rating,
      review: appRatingsTable.review,
      userName: usersTable.name,
      userAvatarUrl: usersTable.avatarUrl,
      createdAt: appRatingsTable.createdAt,
    })
    .from(appRatingsTable)
    .innerJoin(usersTable, eq(appRatingsTable.userId, usersTable.id))
    .where(and(eq(appRatingsTable.appId, appId), sql`${appRatingsTable.review} is not null and ${appRatingsTable.review} <> ''`))
    .orderBy(desc(appRatingsTable.createdAt));
}
