import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, postReactionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const ALLOWED = new Set(["🔥", "❤️", "👏", "🤯", "⚡", "👍", "🙌", "👀"]);

const router: IRouter = Router();

router.post("/posts/:postId/reactions", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  const emoji = String(req.body?.emoji ?? "");
  if (!Number.isInteger(postId) || !ALLOWED.has(emoji)) {
    res.status(400).json({ error: "Invalid postId or emoji" });
    return;
  }
  const userId = req.user!.id;
  const existing = await db
    .select()
    .from(postReactionsTable)
    .where(
      and(
        eq(postReactionsTable.postId, postId),
        eq(postReactionsTable.userId, userId),
        eq(postReactionsTable.emoji, emoji),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db.delete(postReactionsTable).where(eq(postReactionsTable.id, existing[0].id));
    res.json({ reacted: false });
    return;
  }
  await db.insert(postReactionsTable).values({ postId, userId, emoji });
  res.json({ reacted: true });
});

export default router;
