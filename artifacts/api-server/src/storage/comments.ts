import { eq, asc } from "drizzle-orm";
import { db, commentsTable, usersTable } from "@workspace/db";

export type CommentWithMeta = {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  isBuild: boolean;
  createdAt: Date;
};

export async function listCommentsByPost(postId: number): Promise<CommentWithMeta[]> {
  const rows = await db
    .select({
      id: commentsTable.id,
      postId: commentsTable.postId,
      authorId: commentsTable.authorId,
      authorName: usersTable.name,
      authorAvatarUrl: usersTable.avatarUrl,
      body: commentsTable.body,
      isBuild: commentsTable.isBuild,
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
  return {
    ...comment,
    authorName: user[0]?.name ?? "Unknown",
    authorAvatarUrl: user[0]?.avatarUrl ?? null,
  };
}

export async function setCommentIsBuild(id: number, isBuild: boolean): Promise<void> {
  await db.update(commentsTable).set({ isBuild }).where(eq(commentsTable.id, id));
}

export async function deleteComment(id: number): Promise<void> {
  await db.delete(commentsTable).where(eq(commentsTable.id, id));
}

export async function getComment(id: number) {
  const rows = await db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1);
  return rows[0];
}
