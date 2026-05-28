import { Router, type IRouter } from "express";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, eventsTable, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/events", requireAuth, async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;

  const conditions = [] as ReturnType<typeof gte>[];
  if (from) conditions.push(gte(eventsTable.startsAt, from));
  if (to) conditions.push(lte(eventsTable.startsAt, to));

  const rows = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      startsAt: eventsTable.startsAt,
      endsAt: eventsTable.endsAt,
      createdBy: eventsTable.createdBy,
      createdByName: usersTable.name,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(usersTable.id, eventsTable.createdBy))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(eventsTable.startsAt));

  res.json(rows);
});

router.post("/events", requireAuth, requireAdmin, async (req, res) => {
  const { title, description, startsAt, endsAt } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (typeof startsAt !== "string") {
    res.status(400).json({ error: "startsAt required (ISO string)" });
    return;
  }
  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    res.status(400).json({ error: "invalid startsAt" });
    return;
  }
  const endsAtDate = endsAt ? new Date(endsAt) : null;

  const rows = await db
    .insert(eventsTable)
    .values({
      title: title.trim(),
      description: description ? String(description) : null,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      createdBy: req.user!.id,
    })
    .returning();
  res.status(201).json(rows[0]);
});

router.delete("/events/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.status(204).send();
});

export default router;
