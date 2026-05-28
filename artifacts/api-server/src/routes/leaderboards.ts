import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, usersTable, postsTable, commentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

type Period = "7d" | "30d" | "all";

function sinceDate(period: Period): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

router.get("/leaderboards", requireAuth, async (req, res) => {
  const rawPeriod = String(req.query.period || "30d");
  const period: Period =
    rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "all" ? rawPeriod : "30d";
  const since = sinceDate(period);

  const postClause = since
    ? sql`select author_id, count(*)::int as c from ${postsTable} where created_at >= ${since.toISOString()} group by author_id`
    : sql`select author_id, count(*)::int as c from ${postsTable} group by author_id`;
  const commentClause = since
    ? sql`select author_id, count(*)::int as c from ${commentsTable} where created_at >= ${since.toISOString()} group by author_id`
    : sql`select author_id, count(*)::int as c from ${commentsTable} group by author_id`;

  const rows = await db.execute<{
    user_id: number;
    name: string;
    avatar_url: string | null;
    points: number;
  }>(sql`
    with p as (${postClause}),
         c as (${commentClause})
    select u.id as user_id, u.name as name, u.avatar_url as avatar_url,
           coalesce((select c from p where author_id = u.id), 0) * 3 +
           coalesce((select c from c where author_id = u.id), 0) * 1 as points
    from ${usersTable} u
    where u.is_active = true
    order by points desc, u.created_at asc
    limit 50
  `);

  const entries = (rows.rows ?? rows ?? []).map((row: {
    user_id: number;
    name: string;
    avatar_url: string | null;
    points: number | string;
  }) => ({
    userId: Number(row.user_id),
    name: row.name,
    avatarUrl: row.avatar_url,
    points: Number(row.points || 0),
  }));

  res.json({ period, entries });
});

export default router;
