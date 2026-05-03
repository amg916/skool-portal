import { eq, asc, sql } from "drizzle-orm";
import { db, postsTable, commentsTable, usersTable } from "@workspace/db";

export type PostWithMeta = {
  id: number;
  channelId: number;
  authorId: number;
  authorName: string;
  body: string;
  isPinned: boolean;
  commentCount: number;
  createdAt: Date;
};

export async function listPostsByChannel(channelId: number): Promise<PostWithMeta[]> {
  const rows = await db
    .select({
      id: postsTable.id,
      channelId: postsTable.channelId,
      authorId: postsTable.authorId,
      authorName: usersTable.name,
      body: postsTable.body,
      isPinned: postsTable.isPinned,
      commentCount: sql<number>`cast(count(${commentsTable.id}) as int)`,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .leftJoin(commentsTable, eq(commentsTable.postId, postsTable.id))
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(eq(postsTable.channelId, channelId))
    .groupBy(postsTable.id, usersTable.name)
    .orderBy(asc(postsTable.createdAt));
  return rows as PostWithMeta[];
}

export async function createPost(channelId: number, authorId: number, body: string): Promise<PostWithMeta> {
  const rows = await db
    .insert(postsTable)
    .values({ channelId, authorId, body })
    .returning();
  const post = rows[0];
  const user = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  return {
    ...post,
    authorName: user[0]?.name ?? "Unknown",
    commentCount: 0,
  };
}

export async function deletePost(id: number): Promise<void> {
  await db.delete(postsTable).where(eq(postsTable.id, id));
}

export async function pinPost(id: number): Promise<void> {
  await db.update(postsTable).set({ isPinned: true }).where(eq(postsTable.id, id));
}

export async function unpinPost(id: number): Promise<void> {
  await db.update(postsTable).set({ isPinned: false }).where(eq(postsTable.id, id));
}

export async function getPost(id: number) {
  const rows = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  return rows[0];
}
