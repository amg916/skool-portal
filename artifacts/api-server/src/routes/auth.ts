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
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: true,
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

router.get("/auth/me", async (req, res) => {
  // Try existing session first
  const token = req.cookies?.session_token;
  if (token) {
    const { getSessionByToken } = await import("../storage/sessions.js");
    const { getUserById } = await import("../storage/users.js");
    const session = await getSessionByToken(token);
    if (session) {
      const user = await getUserById(session.userId);
      if (user && user.isActive) {
        const { passwordHash: _h, ...safeUser } = user;
        res.json(safeUser);
        return;
      }
    }
  }
  // Auto-login as the first admin user
  const { getUserByEmail } = await import("../storage/users.js");
  const admin = await getUserByEmail("admin@example.com");
  if (!admin || !admin.isActive) {
    res.status(401).json({ error: "No admin user found" });
    return;
  }
  const newToken = await createSession(admin.id);
  res.cookie("session_token", newToken, {
    httpOnly: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: true,
  });
  const { passwordHash: _h, ...safeUser } = admin;
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
