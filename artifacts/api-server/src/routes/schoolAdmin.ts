import { Router } from "express";
import { listSegments, createSegment, updateSegment, deleteSegment, reorderSegment } from "../storage/segments.js";
import { listSubsectionsBySegment, createSubsection, updateSubsection, deleteSubsection, reorderSubsection } from "../storage/subsections.js";
import { createLesson, updateLesson, deleteLesson, reorderLesson } from "../storage/lessons.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// Segments
router.post("/admin/school/segments", async (req, res) => {
  const { title, description } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const segment = await createSegment({ title, description });
  res.status(201).json(segment);
});

router.patch("/admin/school/segments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, description } = req.body ?? {};
  const segment = await updateSegment(id, { title, description });
  if (!segment) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(segment);
});

router.delete("/admin/school/segments/:id", async (req, res) => {
  const id = Number(req.params.id);
  await deleteSegment(id);
  res.status(204).send();
});

router.post("/admin/school/segments/:id/reorder", async (req, res) => {
  const id = Number(req.params.id);
  const { direction } = req.body ?? {};
  if (!["up", "down"].includes(direction)) {
    res.status(400).json({ error: "direction must be up or down" });
    return;
  }
  await reorderSegment(id, direction);
  res.json({ ok: true });
});

// Subsections
router.post("/admin/school/subsections", async (req, res) => {
  const { segmentId, title, description } = req.body ?? {};
  if (!segmentId || !title) {
    res.status(400).json({ error: "segmentId and title required" });
    return;
  }
  const sub = await createSubsection({ segmentId: Number(segmentId), title, description });
  res.status(201).json(sub);
});

router.patch("/admin/school/subsections/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, description } = req.body ?? {};
  const sub = await updateSubsection(id, { title, description });
  if (!sub) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(sub);
});

router.delete("/admin/school/subsections/:id", async (req, res) => {
  const id = Number(req.params.id);
  await deleteSubsection(id);
  res.status(204).send();
});

router.post("/admin/school/subsections/:id/reorder", async (req, res) => {
  const id = Number(req.params.id);
  const { direction } = req.body ?? {};
  if (!["up", "down"].includes(direction)) {
    res.status(400).json({ error: "direction must be up or down" });
    return;
  }
  await reorderSubsection(id, direction);
  res.json({ ok: true });
});

// Lessons
router.post("/admin/school/lessons", async (req, res) => {
  const { subsectionId, title, type, content, uploadId } = req.body ?? {};
  if (!subsectionId || !title || !type) {
    res.status(400).json({ error: "subsectionId, title, type required" });
    return;
  }
  if (!["loom", "pdf", "link", "text"].includes(type)) {
    res.status(400).json({ error: "type must be loom, pdf, link, or text" });
    return;
  }
  if (type === "pdf" && !uploadId) {
    res.status(400).json({ error: "PDF lesson requires uploadId" });
    return;
  }
  const lesson = await createLesson({
    subsectionId: Number(subsectionId),
    title,
    type,
    content: content ?? null,
    uploadId: uploadId ? Number(uploadId) : null,
  });
  res.status(201).json(lesson);
});

router.patch("/admin/school/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, type, content, uploadId } = req.body ?? {};
  const lesson = await updateLesson(id, {
    title,
    type,
    content: content ?? null,
    uploadId: uploadId ? Number(uploadId) : null,
  });
  if (!lesson) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(lesson);
});

router.delete("/admin/school/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  await deleteLesson(id);
  res.status(204).send();
});

router.post("/admin/school/lessons/:id/reorder", async (req, res) => {
  const id = Number(req.params.id);
  const { direction } = req.body ?? {};
  if (!["up", "down"].includes(direction)) {
    res.status(400).json({ error: "direction must be up or down" });
    return;
  }
  await reorderLesson(id, direction);
  res.json({ ok: true });
});

export default router;
