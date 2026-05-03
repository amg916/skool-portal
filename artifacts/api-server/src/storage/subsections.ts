import { eq, asc, sql } from "drizzle-orm";
import { db, subsectionsTable, lessonsTable } from "@workspace/db";
import type { Subsection, InsertSubsection } from "@workspace/db";

export type SubsectionWithCounts = Subsection & { lessonCount: number };

export async function listSubsectionsBySegment(segmentId: number): Promise<SubsectionWithCounts[]> {
  const rows = await db
    .select({
      id: subsectionsTable.id,
      segmentId: subsectionsTable.segmentId,
      title: subsectionsTable.title,
      description: subsectionsTable.description,
      sortOrder: subsectionsTable.sortOrder,
      createdAt: subsectionsTable.createdAt,
      lessonCount: sql<number>`cast(count(${lessonsTable.id}) as int)`,
    })
    .from(subsectionsTable)
    .leftJoin(lessonsTable, eq(lessonsTable.subsectionId, subsectionsTable.id))
    .where(eq(subsectionsTable.segmentId, segmentId))
    .groupBy(subsectionsTable.id)
    .orderBy(asc(subsectionsTable.sortOrder));
  return rows as SubsectionWithCounts[];
}

export async function createSubsection(data: Omit<InsertSubsection, "sortOrder">): Promise<Subsection> {
  const existing = await db
    .select()
    .from(subsectionsTable)
    .where(eq(subsectionsTable.segmentId, data.segmentId))
    .orderBy(asc(subsectionsTable.sortOrder));
  const maxOrder = existing.reduce((m, s) => Math.max(m, s.sortOrder), -1);
  const rows = await db.insert(subsectionsTable).values({ ...data, sortOrder: maxOrder + 1 }).returning();
  return rows[0];
}

export async function updateSubsection(id: number, data: Partial<InsertSubsection>): Promise<Subsection | undefined> {
  const rows = await db.update(subsectionsTable).set(data).where(eq(subsectionsTable.id, id)).returning();
  return rows[0];
}

export async function deleteSubsection(id: number): Promise<void> {
  await db.delete(subsectionsTable).where(eq(subsectionsTable.id, id));
}

export async function reorderSubsection(id: number, direction: "up" | "down"): Promise<void> {
  const sub = await db.select().from(subsectionsTable).where(eq(subsectionsTable.id, id)).limit(1);
  if (!sub[0]) return;
  const siblings = await db
    .select()
    .from(subsectionsTable)
    .where(eq(subsectionsTable.segmentId, sub[0].segmentId))
    .orderBy(asc(subsectionsTable.sortOrder));
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;
  const a = siblings[idx];
  const b = siblings[swapIdx];
  await db.update(subsectionsTable).set({ sortOrder: b.sortOrder }).where(eq(subsectionsTable.id, a.id));
  await db.update(subsectionsTable).set({ sortOrder: a.sortOrder }).where(eq(subsectionsTable.id, b.id));
}
