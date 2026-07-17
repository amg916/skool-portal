import { eq, and, sql } from "drizzle-orm";
import { db, appsTable, appVotesTable, type AppStage } from "@workspace/db";
import { getAppBySlug, type AppDetail } from "./apps.js";

/** Lowercase, hyphenate, strip anything that isn't a-z0-9 or dash. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type SubmitAppInput = {
  name: string;
  slug?: string;
  tagline?: string;
  description?: string;
  categoryId: number;
  externalUrl: string;
};

/**
 * Member submission. The stage, ownership, and first-party flag are ALWAYS
 * server-forced — a member can never self-promote to graduated or claim
 * is_first_party.
 */
export async function submitApp(userId: number, input: SubmitAppInput): Promise<AppDetail> {
  let slug = (input.slug && input.slug.trim()) || slugify(input.name);
  if (!slug) slug = `app-${Date.now()}`;
  // de-dupe slug
  const existing = await db.select({ slug: appsTable.slug }).from(appsTable).where(eq(appsTable.slug, slug));
  if (existing.length) slug = `${slug}-${Date.now().toString(36)}`;

  const [row] = await db
    .insert(appsTable)
    .values({
      slug,
      name: input.name,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      categoryId: input.categoryId,
      ownerId: userId,
      isFirstParty: false,
      stage: "submitted",
      accessType: "link_out",
      externalUrl: input.externalUrl,
    })
    .returning({ slug: appsTable.slug });

  const app = await getAppBySlug(row!.slug);
  if (!app) throw new Error("submit failed");
  return app;
}

type VoteResult = { voteCount: number; votedByMe: boolean };

async function voteState(appId: number, userId: number): Promise<VoteResult> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appVotesTable)
    .where(eq(appVotesTable.appId, appId));
  const mine = await db
    .select({ id: appVotesTable.id })
    .from(appVotesTable)
    .where(and(eq(appVotesTable.appId, appId), eq(appVotesTable.userId, userId)));
  return { voteCount: count ?? 0, votedByMe: mine.length > 0 };
}

/** Cast a vote. Idempotent (unique index + do-nothing). Graduated apps aren't votable. */
export async function voteApp(appId: number, userId: number): Promise<VoteResult> {
  const [app] = await db.select({ stage: appsTable.stage }).from(appsTable).where(eq(appsTable.id, appId));
  if (!app) throw new Error("app not found");
  if (app.stage === "graduated" || app.stage === "retired") {
    throw new Error("app is not votable");
  }
  await db.insert(appVotesTable).values({ appId, userId }).onConflictDoNothing();
  return voteState(appId, userId);
}

export async function unvoteApp(appId: number, userId: number): Promise<VoteResult> {
  await db.delete(appVotesTable).where(and(eq(appVotesTable.appId, appId), eq(appVotesTable.userId, userId)));
  return voteState(appId, userId);
}

/** Set an app's stage. Graduation stamps graduated_at + graduated_by. */
export async function setStage(appId: number, stage: AppStage, actorId: number): Promise<AppDetail | null> {
  const patch: Record<string, unknown> = { stage, updatedAt: new Date() };
  if (stage === "graduated") {
    patch.graduatedAt = new Date();
    patch.graduatedBy = actorId;
  }
  const [row] = await db
    .update(appsTable)
    .set(patch)
    .where(eq(appsTable.id, appId))
    .returning({ slug: appsTable.slug });
  return row ? getAppBySlug(row.slug) : null;
}
