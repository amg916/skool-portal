import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, userIdentitiesTable } from "@workspace/db";
import { getUserByEmail, setUserPassword } from "../storage/users.js";
import { createSession, deleteSession } from "../storage/sessions.js";
import { verifyPassword, hashPassword } from "../lib/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import { loginLimit } from "../rateLimits.js";
import { validateBody } from "../validate.js";
import { apiError } from "../errors.js";
import { LoginBody, ChangePasswordBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", loginLimit, validateBody(LoginBody), async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).toLowerCase();
  const user = await getUserByEmail(normalizedEmail);
  if (!user || !user.isActive) {
    apiError(res, 401, "Invalid credentials");
    return;
  }
  if (!user.passwordHash) {
    apiError(res, 401, "This account uses social sign-in. Use the Continue with… buttons.");
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
  await db
    .insert(userIdentitiesTable)
    .values({
      userId: user.id,
      provider: "email",
      providerUserId: String(user.id),
      providerEmail: user.email,
      providerData: null,
    })
    .onConflictDoUpdate({
      target: [userIdentitiesTable.provider, userIdentitiesTable.providerUserId],
      set: { lastSignInAt: new Date() },
    });
  const { passwordHash: _h, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/auth/signup", loginLimit, async (req, res) => {
  const { email, password, name } = req.body ?? {};
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    apiError(res, 400, "Enter a valid email address");
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    apiError(res, 400, "Password must be at least 8 characters");
    return;
  }
  if (cleanName.length === 0 || cleanName.length > 80) {
    apiError(res, 400, "Name is required (max 80 chars)");
    return;
  }
  const existing = await getUserByEmail(cleanEmail);
  if (existing) {
    apiError(res, 409, "An account already exists for that email. Try logging in.");
    return;
  }
  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(usersTable)
    .values({
      email: cleanEmail,
      name: cleanName,
      role: "member",
      passwordHash,
      isActive: true,
      forcePasswordChange: false,
    })
    .returning();
  const user = inserted[0]!;

  await db.insert(userIdentitiesTable).values({
    userId: user.id,
    provider: "email",
    providerUserId: String(user.id),
    providerEmail: user.email,
  });

  const token = await createSession(user.id);
  res.cookie("session_token", token, {
    httpOnly: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: true,
  });
  const { passwordHash: _h, ...safeUser } = user;
  res.status(201).json(safeUser);
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
  if (!req.user!.passwordHash) {
    apiError(res, 400, "Your account is social-only; set a password is not yet supported from change-password.");
    return;
  }
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

router.get("/auth/identities", requireAuth, async (req, res) => {
  const rows = await db
    .select({
      provider: userIdentitiesTable.provider,
      providerEmail: userIdentitiesTable.providerEmail,
      lastSignInAt: userIdentitiesTable.lastSignInAt,
      createdAt: userIdentitiesTable.createdAt,
    })
    .from(userIdentitiesTable)
    .where(eq(userIdentitiesTable.userId, req.user!.id));
  res.json(rows);
});

export default router;
