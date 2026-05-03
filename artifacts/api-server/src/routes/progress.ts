import { Router } from "express";
import { setLessonCompletion, getUserProgressRollups, getAdminProgressTable } from "../storage/progress.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.post("/progress/lessons/:lessonId", requireAuth, async (req, res) => {
  const lessonId = Number(req.params.lessonId);
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lessonId" });
    return;
  }
  const { completed } = req.body ?? {};
  if (typeof completed !== "boolean") {
    res.status(400).json({ error: "completed (boolean) required" });
    return;
  }
  await setLessonCompletion(req.user!.id, lessonId, completed);
  res.json({ lessonId, completed });
});

router.get("/progress/me", requireAuth, async (req, res) => {
  const rollup = await getUserProgressRollups(req.user!.id);
  res.json(rollup);
});

router.get("/admin/progress", requireAuth, requireAdmin, async (_req, res) => {
  const table = await getAdminProgressTable();
  res.json(table);
});

export default router;
