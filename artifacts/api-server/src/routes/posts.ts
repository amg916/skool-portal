import { Router } from "express";
import { listPostsByChannel, createPost, deletePost, pinPost, unpinPost, getPost } from "../storage/posts.js";
import { listChannels } from "../storage/channels.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { validateBody } from "../validate.js";
import { CreatePostBody } from "@workspace/api-zod";
import { extractLoomShareId, canonicalLoomShareUrl } from "../lib/loom.js";

const router = Router();

router.get("/channels/:channelId/posts", requireAuth, async (req, res) => {
  const channelId = Number(req.params.channelId);
  if (isNaN(channelId)) {
    res.status(400).json({ error: "Invalid channelId" });
    return;
  }
  const posts = await listPostsByChannel(channelId, req.user!.id);
  res.json(posts);
});

router.post("/channels/:channelId/posts", requireAuth, validateBody(CreatePostBody), async (req, res) => {
  const channelId = Number(req.params.channelId);
  const { body, loomUrl: rawLoomUrl } = req.body as { body: string; loomUrl?: string | null };

  const channels = await listChannels();
  const channel = channels.find((c) => c.id === channelId);
  if (channel?.adminsOnly && req.user!.role !== "admin") {
    res.status(403).json({ error: "This channel is restricted to admins" });
    return;
  }

  let loomUrl: string | null = null;
  if (typeof rawLoomUrl === "string" && rawLoomUrl.trim()) {
    const shareId = extractLoomShareId(rawLoomUrl);
    if (!shareId) {
      res.status(400).json({ error: "Loom link looks invalid. Paste a https://www.loom.com/share/... URL." });
      return;
    }
    loomUrl = canonicalLoomShareUrl(shareId);
  }

  const post = await createPost(channelId, req.user!.id, body, loomUrl);
  res.status(201).json(post);
});

router.delete("/posts/:postId", requireAuth, async (req, res) => {
  const postId = Number(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid postId" });
    return;
  }
  const post = await getPost(postId);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (post.authorId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await deletePost(postId);
  res.status(204).send();
});

router.post("/posts/:postId/pin", requireAuth, requireAdmin, async (req, res) => {
  const postId = Number(req.params.postId);
  await pinPost(postId);
  res.json({ ok: true });
});

router.post("/posts/:postId/unpin", requireAuth, requireAdmin, async (req, res) => {
  const postId = Number(req.params.postId);
  await unpinPost(postId);
  res.json({ ok: true });
});

export default router;
