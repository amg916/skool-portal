import { Router } from "express";
import { listChannels, createChannel, updateChannel, deleteChannel, reorderChannel } from "../storage/channels.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/channels", requireAuth, async (_req, res) => {
  const channels = await listChannels();
  res.json(channels);
});

router.post("/admin/channels", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, adminsOnly } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const channel = await createChannel({ name, description, adminsOnly: adminsOnly ?? false });
  res.status(201).json(channel);
});

router.patch("/admin/channels/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { name, description, adminsOnly } = req.body ?? {};
  const channel = await updateChannel(id, { name, description, adminsOnly });
  if (!channel) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(channel);
});

router.delete("/admin/channels/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await deleteChannel(id);
  res.status(204).send();
});

router.post("/admin/channels/:id/reorder", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { direction } = req.body ?? {};
  if (!["up", "down"].includes(direction)) {
    res.status(400).json({ error: "direction must be up or down" });
    return;
  }
  await reorderChannel(id, direction);
  res.json({ ok: true });
});

export default router;
