import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createUploadRecord, getUploadById, deleteUploadRecord } from "../storage/uploads.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${crypto.randomBytes(16).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const router = Router();

router.post(
  "/admin/uploads/pdf",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded or invalid file type" });
      return;
    }
    const record = await createUploadRecord({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
    res.json({
      id: record.id,
      url: `/uploads/${record.filename}`,
      filename: record.filename,
      originalName: record.originalName,
      size: record.size,
    });
  }
);

router.delete("/admin/uploads/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const record = await getUploadById(id);
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const filePath = path.join(UPLOAD_DIR, record.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await deleteUploadRecord(id);
  res.status(204).send();
});

export default router;
