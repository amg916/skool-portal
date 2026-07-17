import { Router } from "express";
import {
  listApps,
  getAppBySlug,
  createApp,
  updateApp,
  retireApp,
} from "../storage/apps.js";
import { submitApp, voteApp, unvoteApp, setStage } from "../storage/incubator.js";
import { listAppCategories } from "../storage/appCategories.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { validateBody } from "../validate.js";
import { CreateAppBody, UpdateAppBody, SubmitAppBody, SetAppStageBody } from "@workspace/api-zod";
import type { AppStage, AppAccessType } from "@workspace/db";

const router = Router();

router.get("/app-categories", requireAuth, async (_req, res) => {
  res.json(await listAppCategories());
});

router.get("/apps", requireAuth, async (req, res) => {
  const { category, stage, q } = req.query as Record<string, string | undefined>;
  res.json(await listApps({ category, stage: stage as AppStage | undefined, q, viewerId: req.user!.id }));
});

// Member submission — registered before /apps/:slug so "submit" isn't read as a slug.
router.post("/apps/submit", requireAuth, validateBody(SubmitAppBody), async (req, res) => {
  const app = await submitApp(req.user!.id, req.body);
  res.status(201).json(app);
});

router.post("/apps/:id/vote", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    res.json(await voteApp(id, req.user!.id));
  } catch (e) {
    res.status(409).json({ error: e instanceof Error ? e.message : "Not votable" });
  }
});

router.delete("/apps/:id/vote", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  res.json(await unvoteApp(id, req.user!.id));
});

router.post("/admin/apps/:id/stage", requireAuth, requireAdmin, validateBody(SetAppStageBody), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const app = await setStage(id, req.body.stage as AppStage, req.user!.id);
  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(app);
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
