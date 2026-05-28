import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, groupSettingsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router: IRouter = Router();

const DEFAULTS = {
  name: "Baingers",
  slug: "baingers.com",
  description: "Bangers. AI bangers. Only the absolute heat — clips, breakdowns, and reactions to the best AI drops, every day.",
  bannerUrl: null as string | null,
  iconUrl: null as string | null,
};

async function ensureRow() {
  const existing = await db.select().from(groupSettingsTable).limit(1);
  if (existing[0]) return existing[0];
  const rows = await db.insert(groupSettingsTable).values(DEFAULTS).returning();
  return rows[0]!;
}

router.get("/group", requireAuth, async (_req, res) => {
  const row = await ensureRow();
  res.json(row);
});

router.patch("/group", requireAuth, requireAdmin, async (req, res) => {
  const row = await ensureRow();
  const { name, slug, description, bannerUrl, iconUrl } = req.body ?? {};
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof name === "string") patch.name = name.trim();
  if (typeof slug === "string") patch.slug = slug.trim();
  if (typeof description === "string") patch.description = description;
  if (typeof bannerUrl === "string" || bannerUrl === null) patch.bannerUrl = bannerUrl;
  if (typeof iconUrl === "string" || iconUrl === null) patch.iconUrl = iconUrl;
  const updated = await db
    .update(groupSettingsTable)
    .set(patch)
    .where(eq(groupSettingsTable.id, row.id))
    .returning();
  res.json(updated[0]);
});

export default router;
