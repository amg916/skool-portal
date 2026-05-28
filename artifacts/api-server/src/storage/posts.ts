import { eq, asc, sql, and } from "drizzle-orm";
import { db, postsTable, commentsTable, likesTable, usersTable } from "@workspace/db";

export type PostWithMeta = {
  id: number;
  channelId: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  isPinned: boolean;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: Date;
};

export async function listPostsByChannel(
  channelId: number,
  viewerId: number,
): Promise<PostWithMeta[]> {
  const rows = await db
    .select({
      id: postsTable.id,
      channelId: postsTable.channelId,
      authorId: postsTable.authorId,
      authorName: usersTable.name,
      authorAvatarUrl: usersTable.avatarUrl,
      body: postsTable.body,
      isPinned: postsTable.isPinned,
      commentCount: sql<number>`cast((select count(*) from ${commentsTable} c where c.post_id = ${postsTable.id}) as int)`,
      likeCount: sql<number>`cast((select count(*) from ${likesTable} l where l.post_id = ${postsTable.id}) as int)`,
      likedByMe: sql<boolean>`exists(select 1 from ${likesTable} l where l.post_id = ${postsTable.id} and l.user_id = ${viewerId})`,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(eq(postsTable.channelId, channelId))
    .orderBy(asc(postsTable.createdAt));
  return rows as PostWithMeta[];
}

export async function createPost(
  channelId: number,
  authorId: number,
  body: string,
): Promise<PostWithMeta> {
  const rows = await db
    .insert(postsTable)
    .values({ channelId, authorId, body })
    .returning();
  const post = rows[0];
  const user = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  return {
    ...post,
    authorName: user[0]?.name ?? "Unknown",
    authorAvatarUrl: user[0]?.avatarUrl ?? null,
    commentCount: 0,
    likeCount: 0,
    likedByMe: false,
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
