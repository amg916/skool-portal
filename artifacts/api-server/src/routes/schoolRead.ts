import { Router } from "express";
import { listSegments } from "../storage/segments.js";
import { listSubsectionsBySegment } from "../storage/subsections.js";
import { listLessonsBySubsection, getLesson } from "../storage/lessons.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/school/segments", requireAuth, async (_req, res) => {
  const segments = await listSegments();
  res.json(segments);
});

router.get("/school/segments/:segmentId/subsections", requireAuth, async (req, res) => {
  const segmentId = Number(req.params.segmentId);
  if (isNaN(segmentId)) {
    res.status(400).json({ error: "Invalid segmentId" });
    return;
  }
  const subsections = await listSubsectionsBySegment(segmentId);
  res.json(subsections);
});

router.get("/school/subsections/:subsectionId/lessons", requireAuth, async (req, res) => {
  const subsectionId = Number(req.params.subsectionId);
  if (isNaN(subsectionId)) {
    res.status(400).json({ error: "Invalid subsectionId" });
    return;
  }
  const lessons = await listLessonsBySubsection(subsectionId, req.user!.id);
  res.json(lessons);
});

router.get("/school/lessons/:lessonId", requireAuth, async (req, res) => {
  const lessonId = Number(req.params.lessonId);
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lessonId" });
    return;
  }
  const lesson = await getLesson(lessonId, req.user!.id);
  if (!lesson) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(lesson);
});

export default router;
