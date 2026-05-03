import { eq, asc, and } from "drizzle-orm";
import { db, lessonsTable, uploadsTable, lessonCompletionsTable } from "@workspace/db";
import type { Lesson, InsertLesson } from "@workspace/db";

export type LessonWithMeta = Lesson & { uploadUrl: string | null; isCompleted: boolean };

export async function listLessonsBySubsection(subsectionId: number, userId?: number): Promise<LessonWithMeta[]> {
  const rows = await db
    .select()
    .from(lessonsTable)
    .leftJoin(uploadsTable, eq(uploadsTable.id, lessonsTable.uploadId))
    .where(eq(lessonsTable.subsectionId, subsectionId))
    .orderBy(asc(lessonsTable.sortOrder));

  const completionSet = new Set<number>();
  if (userId) {
    const completions = await db
      .select()
      .from(lessonCompletionsTable)
      .where(and(eq(lessonCompletionsTable.userId, userId), eq(lessonCompletionsTable.completed, true)));
    completions.forEach((c) => completionSet.add(c.lessonId));
  }

  return rows.map((row) => ({
    ...row.lessons,
    uploadUrl: row.uploads ? `/uploads/${row.uploads.filename}` : null,
    isCompleted: completionSet.has(row.lessons.id),
  }));
}

export async function getLesson(id: number, userId?: number): Promise<LessonWithMeta | undefined> {
  const rows = await db
    .select()
    .from(lessonsTable)
    .leftJoin(uploadsTable, eq(uploadsTable.id, lessonsTable.uploadId))
    .where(eq(lessonsTable.id, id))
    .limit(1);
  if (!rows[0]) return undefined;

  let isCompleted = false;
  if (userId) {
    const c = await db
      .select()
      .from(lessonCompletionsTable)
      .where(
        and(
          eq(lessonCompletionsTable.userId, userId),
          eq(lessonCompletionsTable.lessonId, id),
          eq(lessonCompletionsTable.completed, true)
        )
      )
      .limit(1);
    isCompleted = c.length > 0;
  }

  return {
    ...rows[0].lessons,
    uploadUrl: rows[0].uploads ? `/uploads/${rows[0].uploads.filename}` : null,
    isCompleted,
  };
}

export async function createLesson(data: Omit<InsertLesson, "sortOrder">): Promise<Lesson> {
  const existing = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.subsectionId, data.subsectionId))
    .orderBy(asc(lessonsTable.sortOrder));
  const maxOrder = existing.reduce((m, l) => Math.max(m, l.sortOrder), -1);
  const rows = await db.insert(lessonsTable).values({ ...data, sortOrder: maxOrder + 1 }).returning();
  return rows[0];
}

export async function updateLesson(id: number, data: Partial<InsertLesson>): Promise<Lesson | undefined> {
  const rows = await db.update(lessonsTable).set(data).where(eq(lessonsTable.id, id)).returning();
  return rows[0];
}

export async function deleteLesson(id: number): Promise<void> {
  await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
}

export async function reorderLesson(id: number, direction: "up" | "down"): Promise<void> {
  const lesson = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!lesson[0]) return;
  const siblings = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.subsectionId, lesson[0].subsectionId))
    .orderBy(asc(lessonsTable.sortOrder));
  const idx = siblings.findIndex((l) => l.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;
  const a = siblings[idx];
  const b = siblings[swapIdx];
  await db.update(lessonsTable).set({ sortOrder: b.sortOrder }).where(eq(lessonsTable.id, a.id));
  await db.update(lessonsTable).set({ sortOrder: a.sortOrder }).where(eq(lessonsTable.id, b.id));
}
