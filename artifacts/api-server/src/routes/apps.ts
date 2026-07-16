import { Router } from "express";
import {
  listApps,
  getAppBySlug,
  createApp,
  updateApp,
  retireApp,
} from "../storage/apps.js";
import { listAppCategories } from "../storage/appCategories.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { validateBody } from "../validate.js";
import { CreateAppBody, UpdateAppBody } from "@workspace/api-zod";
import type { AppStage, AppAccessType } from "@workspace/db";

const router = Router();

router.get("/app-categories", requireAuth, async (_req, res) => {
  res.json(await listAppCategories());
});

router.get("/apps", requireAuth, async (req, res) => {
  const { category, stage, q } = req.query as Record<string, string | undefined>;
  res.json(await listApps({ category, stage: stage as AppStage | undefined, q }));
});

router.get("/apps/:slug", requireAuth, async (req, res) => {
  const app = await getAppBySlug(String(req.params.slug));
  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(app);
});

router.post("/admin/apps", requireAuth, requireAdmin, validateBody(CreateAppBody), async (req, res) => {
  const app = await createApp({ ...req.body, ownerId: req.user!.id });
  res.status(201).json(app);
});

router.patch("/admin/apps/:id", requireAuth, requireAdmin, validateBody(UpdateAppBody), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const app = await updateApp(id, req.body);
  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(app);
});

router.delete("/admin/apps/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await retireApp(id);
  res.status(204).send();
});

export default router;
