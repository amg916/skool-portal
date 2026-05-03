import { eq, and } from "drizzle-orm";
import { db, lessonCompletionsTable, lessonsTable, subsectionsTable, segmentsTable, usersTable } from "@workspace/db";

export async function setLessonCompletion(
  userId: number,
  lessonId: number,
  completed: boolean
): Promise<void> {
  const existing = await db
    .select()
    .from(lessonCompletionsTable)
    .where(
      and(
        eq(lessonCompletionsTable.userId, userId),
        eq(lessonCompletionsTable.lessonId, lessonId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(lessonCompletionsTable)
      .set({ completed, completedAt: new Date() })
      .where(
        and(
          eq(lessonCompletionsTable.userId, userId),
          eq(lessonCompletionsTable.lessonId, lessonId)
        )
      );
  } else {
    await db.insert(lessonCompletionsTable).values({ userId, lessonId, completed });
  }
}

export type SegmentProgress = {
  segmentId: number;
  segmentTitle: string;
  totalLessons: number;
  completedLessons: number;
  percent: number;
};

export type ProgressRollup = {
  totalLessons: number;
  completedLessons: number;
  overallPercent: number;
  bySegment: SegmentProgress[];
};

export async function getUserProgressRollups(userId: number): Promise<ProgressRollup> {
  const allSegments = await db.select().from(segmentsTable).orderBy(segmentsTable.sortOrder);
  const allSubsections = await db.select().from(subsectionsTable);
  const allLessons = await db.select().from(lessonsTable);
  const completions = await db
    .select()
    .from(lessonCompletionsTable)
    .where(and(eq(lessonCompletionsTable.userId, userId), eq(lessonCompletionsTable.completed, true)));

  const completedSet = new Set(completions.map((c) => c.lessonId));

  const bySegment: SegmentProgress[] = allSegments.map((seg) => {
    const subsIds = allSubsections.filter((s) => s.segmentId === seg.id).map((s) => s.id);
    const segLessons = allLessons.filter((l) => subsIds.includes(l.subsectionId));
    const total = segLessons.length;
    const completed = segLessons.filter((l) => completedSet.has(l.id)).length;
    return {
      segmentId: seg.id,
      segmentTitle: seg.title,
      totalLessons: total,
      completedLessons: completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => completedSet.has(l.id)).length;

  return {
    totalLessons,
    completedLessons,
    overallPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    bySegment,
  };
}

export async function getAdminProgressTable() {
  const users = await db.select().from(usersTable).where(eq(usersTable.isActive, true));
  return Promise.all(
    users.map(async (user) => {
      const rollup = await getUserProgressRollups(user.id);
      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        ...rollup,
      };
    })
  );
}
