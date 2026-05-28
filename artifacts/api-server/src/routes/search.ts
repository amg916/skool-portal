import { Router, type IRouter } from "express";
import { ilike, sql, eq, and } from "drizzle-orm";
import {
  db,
  postsTable,
  usersTable,
  lessonsTable,
  channelsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) {
    res.json({ posts: [], members: [], lessons: [] });
    return;
  }
  const like = `%${q}%`;

  const [posts, members, lessons] = await Promise.all([
    db
      .select({
        id: postsTable.id,
        channelId: postsTable.channelId,
        body: postsTable.body,
        authorId: postsTable.authorId,
        authorName: usersTable.name,
        channelName: channelsTable.name,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
      .leftJoin(channelsTable, eq(channelsTable.id, postsTable.channelId))
      .where(ilike(postsTable.body, like))
      .limit(8),
    db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(and(eq(usersTable.isActive, true), ilike(usersTable.name, like)))
      .limit(8),
    db
      .select({
        id: lessonsTable.id,
        title: lessonsTable.title,
        subsectionId: lessonsTable.subsectionId,
      })
      .from(lessonsTable)
      .where(ilike(lessonsTable.title, like))
      .limit(8),
  ]);

  res.json({
    posts: posts.map((p) => ({
      ...p,
      snippet: p.body.length > 140 ? p.body.slice(0, 140) + "…" : p.body,
    })),
    members,
    lessons,
  });
});

export default router;
