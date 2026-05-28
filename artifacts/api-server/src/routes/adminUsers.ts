import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, userIdentitiesTable, postsTable, commentsTable } from "@workspace/db";
import { listUsers, createUserWithTempPassword, resetUserPassword, deactivateUser } from "../storage/users.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { validateBody } from "../validate.js";
import { apiError } from "../errors.js";
import { CreateUserBody } from "@workspace/api-zod";

const router = Router();

router.use("/admin", requireAuth, requireAdmin);

router.get("/admin/users", async (_req, res) => {
  const users = await listUsers();
  const userIds = users.map((u) => u.id);
  let identitiesByUser: Record<number, Array<{ provider: string; providerEmail: string | null; lastSignInAt: Date }>> = {};
  let countsByUser: Record<number, { posts: number; comments: number }> = {};

  if (userIds.length) {
    const idents = await db
      .select({
        userId: userIdentitiesTable.userId,
        provider: userIdentitiesTable.provider,
        providerEmail: userIdentitiesTable.providerEmail,
        lastSignInAt: userIdentitiesTable.lastSignInAt,
      })
      .from(userIdentitiesTable);
    for (const i of idents) {
      const arr = identitiesByUser[i.userId] ?? [];
      arr.push({ provider: i.provider, providerEmail: i.providerEmail, lastSignInAt: i.lastSignInAt });
      identitiesByUser[i.userId] = arr;
    }

    const counts = await db.execute<{
      author_id: number;
      posts: number;
      comments: number;
    }>(sql`
      with p as (select author_id, count(*)::int as c from ${postsTable} group by author_id),
           c as (select author_id, count(*)::int as c from ${commentsTable} group by author_id)
      select u.id as author_id,
             coalesce((select c from p where author_id = u.id), 0) as posts,
             coalesce((select c from c where author_id = u.id), 0) as comments
      from ${usersTable} u
    `);
    const rows = (counts.rows ?? counts ?? []) as Array<{ author_id: number; posts: number | string; comments: number | string }>;
    for (const r of rows) {
      countsByUser[Number(r.author_id)] = {
        posts: Number(r.posts || 0),
        comments: Number(r.comments || 0),
      };
    }
  }

  res.json(
    users.map(({ passwordHash: _h, ...u }) => ({
      ...u,
      identities: identitiesByUser[u.id] ?? [],
      stats: countsByUser[u.id] ?? { posts: 0, comments: 0 },
      lastSignInAt: (identitiesByUser[u.id] ?? []).reduce<Date | null>((acc, i) => {
        if (!acc || i.lastSignInAt > acc) return i.lastSignInAt;
        return acc;
      }, null),
    })),
  );
});

router.patch("/admin/users/:id/role", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    apiError(res, 400, "Invalid id");
    return;
  }
  const { role } = req.body ?? {};
  if (role !== "admin" && role !== "member") {
    apiError(res, 400, "role must be 'admin' or 'member'");
    return;
  }
  if (userId === req.user!.id && role === "member") {
    apiError(res, 400, "You can't demote yourself. Ask another admin.");
    return;
  }
  await db.update(usersTable).set({ role }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.patch("/admin/users/:id/activate", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    apiError(res, 400, "Invalid id");
    return;
  }
  await db.update(usersTable).set({ isActive: true }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.post("/admin/users", validateBody(CreateUserBody), async (req, res) => {
  const { email, name, role } = req.body;
  const { user, tempPassword } = await createUserWithTempPassword(email, name, role);
  const { passwordHash: _h, ...safeUser } = user;
  res.status(201).json({ user: safeUser, tempPassword });
});

router.post("/admin/users/:id/reset-password", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    apiError(res, 400, "Invalid user id");
    return;
  }
  const tempPassword = await resetUserPassword(userId);
  res.json({ tempPassword });
});

router.patch("/admin/users/:id/deactivate", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    apiError(res, 400, "Invalid user id");
    return;
  }
  await deactivateUser(userId);
  res.json({ ok: true });
});

export default router;
