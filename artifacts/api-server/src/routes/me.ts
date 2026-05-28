import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_AVATAR_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `avatar_${crypto.randomBytes(12).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AVATAR_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPEG, WEBP, or GIF images allowed"));
  },
});

const router: IRouter = Router();

router.post("/me/avatar", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = `/uploads/${req.file.filename}`;
  await db
    .update(usersTable)
    .set({ avatarUrl: url })
    .where(eq(usersTable.id, req.user!.id));
  res.json({ avatarUrl: url });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { name, bio } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof bio === "string") patch.bio = bio;
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const rows = await db
    .update(usersTable)
    .set(patch)
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json(rows[0]);
});

export default router;
