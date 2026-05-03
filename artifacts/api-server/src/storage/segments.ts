import { eq, asc, sql } from "drizzle-orm";
import { db, segmentsTable, subsectionsTable, lessonsTable } from "@workspace/db";
import type { Segment, InsertSegment } from "@workspace/db";

export type SegmentWithCounts = Segment & { subsectionCount: number; lessonCount: number };

export async function listSegments(): Promise<SegmentWithCounts[]> {
  const rows = await db
    .select({
      id: segmentsTable.id,
      title: segmentsTable.title,
      description: segmentsTable.description,
      sortOrder: segmentsTable.sortOrder,
      createdAt: segmentsTable.createdAt,
      subsectionCount: sql<number>`cast(count(distinct ${subsectionsTable.id}) as int)`,
      lessonCount: sql<number>`cast(count(${lessonsTable.id}) as int)`,
    })
    .from(segmentsTable)
    .leftJoin(subsectionsTable, eq(subsectionsTable.segmentId, segmentsTable.id))
    .leftJoin(lessonsTable, eq(lessonsTable.subsectionId, subsectionsTable.id))
    .groupBy(segmentsTable.id)
    .orderBy(asc(segmentsTable.sortOrder));
  return rows as SegmentWithCounts[];
}

export async function createSegment(data: Omit<InsertSegment, "sortOrder">): Promise<Segment> {
  const existing = await db.select().from(segmentsTable).orderBy(asc(segmentsTable.sortOrder));
  const maxOrder = existing.reduce((m, s) => Math.max(m, s.sortOrder), -1);
  const rows = await db.insert(segmentsTable).values({ ...data, sortOrder: maxOrder + 1 }).returning();
  return rows[0];
}

export async function updateSegment(id: number, data: Partial<InsertSegment>): Promise<Segment | undefined> {
  const rows = await db.update(segmentsTable).set(data).where(eq(segmentsTable.id, id)).returning();
  return rows[0];
}

export async function deleteSegment(id: number): Promise<void> {
  await db.delete(segmentsTable).where(eq(segmentsTable.id, id));
}

export async function reorderSegment(id: number, direction: "up" | "down"): Promise<void> {
  const segments = await db.select().from(segmentsTable).orderBy(asc(segmentsTable.sortOrder));
  const idx = segments.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= segments.length) return;
  const a = segments[idx];
  const b = segments[swapIdx];
  await db.update(segmentsTable).set({ sortOrder: b.sortOrder }).where(eq(segmentsTable.id, a.id));
  await db.update(segmentsTable).set({ sortOrder: a.sortOrder }).where(eq(segmentsTable.id, b.id));
}
