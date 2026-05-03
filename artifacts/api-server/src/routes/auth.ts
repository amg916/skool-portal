import { Router } from "express";
import { getUserByEmail, setUserPassword } from "../storage/users.js";
import { createSession, deleteSession } from "../storage/sessions.js";
import { verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import { loginLimit } from "../rateLimits.js";
import { validateBody } from "../validate.js";
import { apiError } from "../errors.js";
import { LoginBody, ChangePasswordBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", loginLimit, validateBody(LoginBody), async (req, res) => {
  const { email, password } = req.body;
  const user = await getUserByEmail(email);
  if (!user || !user.isActive) {
    apiError(res, 401, "Invalid credentials");
    return;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    apiError(res, 401, "Invalid credentials");
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

router.post("/auth/change-password", requireAuth, validateBody(ChangePasswordBody), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const valid = await verifyPassword(currentPassword, req.user!.passwordHash);
  if (!valid) {
    apiError(res, 401, "Current password is incorrect");
    return;
  }
  if (newPassword.length < 8) {
    apiError(res, 400, "New password must be at least 8 characters");
    return;
  }
  await setUserPassword(req.user!.id, newPassword);
  res.json({ ok: true });
});

export default router;
