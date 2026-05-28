import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  suggestionsTable,
  suggestionVotesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/suggestions", requireAuth, async (req, res) => {
  const sort = String(req.query.sort ?? "top");
  const userId = req.user!.id;
  const rows = await db
    .select({
      id: suggestionsTable.id,
      title: suggestionsTable.title,
      body: suggestionsTable.body,
      status: suggestionsTable.status,
      authorId: suggestionsTable.authorId,
      authorName: usersTable.name,
      authorAvatarUrl: usersTable.avatarUrl,
      createdAt: suggestionsTable.createdAt,
      voteCount: sql<number>`cast((select count(*) from ${suggestionVotesTable} v where v.suggestion_id = ${suggestionsTable.id}) as int)`,
      votedByMe: sql<boolean>`exists(select 1 from ${suggestionVotesTable} v where v.suggestion_id = ${suggestionsTable.id} and v.user_id = ${userId})`,
    })
    .from(suggestionsTable)
    .leftJoin(usersTable, eq(usersTable.id, suggestionsTable.authorId))
    .orderBy(
      sort === "new"
        ? desc(suggestionsTable.createdAt)
        : sql`(select count(*) from ${suggestionVotesTable} v where v.suggestion_id = ${suggestionsTable.id}) desc, ${suggestionsTable.createdAt} desc`,
    );
  res.json(rows);
});

router.post("/suggestions", requireAuth, async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!title || title.length > 140) {
    res.status(400).json({ error: "Title required (1-140 chars)" });
    return;
  }
  if (!body || body.length > 4000) {
    res.status(400).json({ error: "Description required (1-4000 chars)" });
    return;
  }
  const inserted = await db
    .insert(suggestionsTable)
    .values({ title, body, authorId: req.user!.id })
    .returning();
  res.status(201).json(inserted[0]);
});

router.post("/suggestions/:id/vote/toggle", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = req.user!.id;
  const existing = await db
    .select()
    .from(suggestionVotesTable)
    .where(and(eq(suggestionVotesTable.suggestionId, id), eq(suggestionVotesTable.userId, userId)))
    .limit(1);
  if (existing[0]) {
    await db.delete(suggestionVotesTable).where(eq(suggestionVotesTable.id, existing[0].id));
    res.json({ voted: false });
    return;
  }
  await db.insert(suggestionVotesTable).values({ suggestionId: id, userId });
  res.json({ voted: true });
});

router.patch("/admin/suggestions/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status ?? "");
  if (!["open", "planned", "done", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  await db.update(suggestionsTable).set({ status: status as "open" | "planned" | "done" | "rejected" }).where(eq(suggestionsTable.id, id));
  res.json({ ok: true });
});

router.delete("/suggestions/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user!.id;
  const row = await db.select().from(suggestionsTable).where(eq(suggestionsTable.id, id)).limit(1);
  if (!row[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (row[0].authorId !== userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(suggestionsTable).where(eq(suggestionsTable.id, id));
  res.status(204).send();
});

export default router;
