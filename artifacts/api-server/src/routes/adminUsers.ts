import { Router } from "express";
import { listUsers, createUserWithTempPassword, resetUserPassword, deactivateUser } from "../storage/users.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/admin/users", async (_req, res) => {
  const users = await listUsers();
  res.json(users.map(({ passwordHash: _h, ...u }) => u));
});

router.post("/admin/users", async (req, res) => {
  const { email, name, role } = req.body ?? {};
  if (!email || !name || !role) {
    res.status(400).json({ error: "email, name, role required" });
    return;
  }
  if (!["admin", "member"].includes(role)) {
    res.status(400).json({ error: "role must be admin or member" });
    return;
  }
  const { user, tempPassword } = await createUserWithTempPassword(email, name, role);
  const { passwordHash: _h, ...safeUser } = user;
  res.status(201).json({ user: safeUser, tempPassword });
});

router.post("/admin/users/:id/reset-password", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const tempPassword = await resetUserPassword(userId);
  res.json({ tempPassword });
});

router.patch("/admin/users/:id/deactivate", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  await deactivateUser(userId);
  res.json({ ok: true });
});

export default router;
