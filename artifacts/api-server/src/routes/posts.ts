import { Router } from "express";
import { listPostsByChannel, createPost, deletePost, pinPost, unpinPost, getPost } from "../storage/posts.js";
import { listChannels } from "../storage/channels.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { extractLoomShareId, canonicalLoomShareUrl } from "../lib/loom.js";
import { parseVideoUrl } from "../lib/video.js";

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

router.post("/channels/:channelId/posts", requireAuth, async (req, res) => {
  const channelId = Number(req.params.channelId);
  if (!Number.isInteger(channelId) || channelId <= 0) {
    res.status(400).json({ error: "Invalid channelId" });
    return;
  }
  const rawBody = req.body?.body;
  if (typeof rawBody !== "string" || !rawBody.trim()) {
    res.status(400).json({ error: "body required" });
    return;
  }
  const body = rawBody.trim();
  const rawLoomUrl = req.body?.loomUrl;

  const channels = await listChannels();
  const channel = channels.find((c) => c.id === channelId);
  if (channel?.adminsOnly && req.user!.role !== "admin") {
    res.status(403).json({ error: "This channel is restricted to admins" });
    return;
  }

  const rawVideoUrl = req.body?.videoUrl ?? rawLoomUrl;
  const rawTags = req.body?.tags;
  let videoUrl: string | null = null;
  let videoProvider:
    | "loom"
    | "youtube"
    | "vimeo"
    | "cloudflare-stream"
    | null = null;
  let videoEmbedId: string | null = null;
  let loomUrl: string | null = null;
  if (typeof rawVideoUrl === "string" && rawVideoUrl.trim()) {
    const parsed = parseVideoUrl(rawVideoUrl);
    if (!parsed) {
      res.status(400).json({
        error: "Video link not recognized. Use Loom, YouTube, Vimeo, or record a banger.",
      });
      return;
    }
    videoUrl = parsed.canonicalUrl;
    videoProvider = parsed.provider;
    videoEmbedId = parsed.embedId;
    if (parsed.provider === "loom") loomUrl = parsed.canonicalUrl;
  }

  const tags = Array.isArray(rawTags)
    ? rawTags.filter((t) => typeof t === "string").map((t) => String(t).trim().toLowerCase()).filter((t) => t.length > 0 && t.length <= 32).slice(0, 6)
    : [];

  const post = await createPost(channelId, req.user!.id, body, loomUrl, {
    videoUrl,
    videoProvider,
    videoEmbedId,
    tags,
  });
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
