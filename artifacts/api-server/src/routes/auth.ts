import { Router } from "express";
import { getUserByEmail, setUserPassword } from "../storage/users.js";
import { createSession, deleteSession } from "../storage/sessions.js";
import { verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const user = await getUserByEmail(email);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = await createSession(user.id);
  res.cookie("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
  });
  const { passwordHash: _h, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  if (req.sessionToken) {
    await deleteSession(req.sessionToken);
  }
  res.clearCookie("session_token");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const { passwordHash: _h, ...safeUser } = req.user!;
  res.json(safeUser);
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword required" });
    return;
  }
  const valid = await verifyPassword(currentPassword, req.user!.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  await setUserPassword(req.user!.id, newPassword);
  res.json({ ok: true });
});

export default router;
