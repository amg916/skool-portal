import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { listUsers } from "../storage/users.js";

const router: IRouter = Router();

router.get("/members", requireAuth, async (_req, res) => {
  const users = await listUsers();
  const members = users
    .filter((u) => u.isActive)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      handle: u.email.split("@")[0],
      joinedAt: u.createdAt,
    }));
  res.json(members);
});

export default router;
