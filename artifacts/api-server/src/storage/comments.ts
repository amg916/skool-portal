import { eq, asc } from "drizzle-orm";
import { db, commentsTable, usersTable } from "@workspace/db";

export type CommentWithMeta = {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: Date;
};

export async function listCommentsByPost(postId: number): Promise<CommentWithMeta[]> {
  const rows = await db
    .select({
      id: commentsTable.id,
      postId: commentsTable.postId,
      authorId: commentsTable.authorId,
      authorName: usersTable.name,
      body: commentsTable.body,
      createdAt: commentsTable.createdAt,
    })
    .from(commentsTable)
    .leftJoin(usersTable, eq(usersTable.id, commentsTable.authorId))
    .where(eq(commentsTable.postId, postId))
    .orderBy(asc(commentsTable.createdAt));
  return rows as CommentWithMeta[];
}

export async function createComment(postId: number, authorId: number, body: string): Promise<CommentWithMeta> {
  const rows = await db
    .insert(commentsTable)
    .values({ postId, authorId, body })
    .returning();
  const comment = rows[0];
  const user = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  return { ...comment, authorName: user[0]?.name ?? "Unknown" };
}

export async function deleteComment(id: number): Promise<void> {
  await db.delete(commentsTable).where(eq(commentsTable.id, id));
}

export async function getComment(id: number) {
  const rows = await db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1);
  return rows[0];
}
