import { Router } from "express";
import { listCommentsByPost, createComment, deleteComment, getComment } from "../storage/comments.js";
import { requireAuth } from "../middlewares/auth.js";
import { validateBody } from "../validate.js";
import { CreateCommentBody } from "@workspace/api-zod";

const router = Router();

router.get("/posts/:postId/comments", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid postId" });
    return;
  }
  const comments = await listCommentsByPost(postId);
  res.json(comments);
});

router.post("/posts/:postId/comments", requireAuth, validateBody(CreateCommentBody), async (req, res) => {
  const postId = Number(req.params.postId);
  const { body } = req.body;
  const comment = await createComment(postId, req.user!.id, body);
  res.status(201).json(comment);
});

router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  const commentId = Number(req.params.commentId);
  if (isNaN(commentId)) {
    res.status(400).json({ error: "Invalid commentId" });
    return;
  }
  const comment = await getComment(commentId);
  if (!comment) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (comment.authorId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await deleteComment(commentId);
  res.status(204).send();
});

export default router;
