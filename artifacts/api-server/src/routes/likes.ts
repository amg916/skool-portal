import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, likesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/posts/:postId/likes/toggle", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    res.status(400).json({ error: "Invalid postId" });
    return;
  }
  const userId = req.user!.id;

  const existing = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)))
    .limit(1);

  if (existing[0]) {
    await db
      .delete(likesTable)
      .where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)));
    res.json({ liked: false });
    return;
  }

  await db.insert(likesTable).values({ postId, userId });
  res.json({ liked: true });
});

export default router;
