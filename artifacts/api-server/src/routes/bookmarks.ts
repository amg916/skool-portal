import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  postBookmarksTable,
  postsTable,
  channelsTable,
  usersTable,
  likesTable,
  commentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/posts/:postId/bookmark/toggle", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId)) {
    res.status(400).json({ error: "Invalid postId" });
    return;
  }
  const userId = req.user!.id;
  const existing = await db
    .select()
    .from(postBookmarksTable)
    .where(and(eq(postBookmarksTable.postId, postId), eq(postBookmarksTable.userId, userId)))
    .limit(1);
  if (existing[0]) {
    await db.delete(postBookmarksTable).where(eq(postBookmarksTable.id, existing[0].id));
    res.json({ bookmarked: false });
    return;
  }
  await db.insert(postBookmarksTable).values({ postId, userId });
  res.json({ bookmarked: true });
});

router.get("/me/bookmarks", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const rows = await db
    .select({
      id: postsTable.id,
      channelId: postsTable.channelId,
      channelName: channelsTable.name,
      authorId: postsTable.authorId,
      authorName: usersTable.name,
      authorAvatarUrl: usersTable.avatarUrl,
      body: postsTable.body,
      videoUrl: postsTable.videoUrl,
      videoProvider: postsTable.videoProvider,
      videoEmbedId: postsTable.videoEmbedId,
      loomUrl: postsTable.loomUrl,
      tags: postsTable.tags,
      isPinned: postsTable.isPinned,
      createdAt: postsTable.createdAt,
      bookmarkedAt: postBookmarksTable.createdAt,
      likeCount: sql<number>`cast((select count(*) from ${likesTable} l where l.post_id = ${postsTable.id}) as int)`,
      commentCount: sql<number>`cast((select count(*) from ${commentsTable} c where c.post_id = ${postsTable.id}) as int)`,
    })
    .from(postBookmarksTable)
    .innerJoin(postsTable, eq(postsTable.id, postBookmarksTable.postId))
    .leftJoin(channelsTable, eq(channelsTable.id, postsTable.channelId))
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(eq(postBookmarksTable.userId, userId))
    .orderBy(desc(postBookmarksTable.createdAt));
  res.json(rows);
});

export default router;
