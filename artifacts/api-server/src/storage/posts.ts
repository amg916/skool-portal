import { eq, asc, sql } from "drizzle-orm";
import { db, postsTable, commentsTable, likesTable, usersTable } from "@workspace/db";

export type RecentCommenter = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

export type PostWithMeta = {
  id: number;
  channelId: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  isPinned: boolean;
  loomUrl: string | null;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  lastCommentAt: Date | null;
  recentCommenters: RecentCommenter[];
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
      loomUrl: postsTable.loomUrl,
      commentCount: sql<number>`cast((select count(*) from ${commentsTable} c where c.post_id = ${postsTable.id}) as int)`,
      likeCount: sql<number>`cast((select count(*) from ${likesTable} l where l.post_id = ${postsTable.id}) as int)`,
      likedByMe: sql<boolean>`exists(select 1 from ${likesTable} l where l.post_id = ${postsTable.id} and l.user_id = ${viewerId})`,
      lastCommentAt: sql<Date | null>`(select max(c.created_at) from ${commentsTable} c where c.post_id = ${postsTable.id})`,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(eq(postsTable.channelId, channelId))
    .orderBy(asc(postsTable.createdAt));

  const postIds = rows.map((r) => r.id);
  let commentersByPost: Record<number, RecentCommenter[]> = {};
  if (postIds.length) {
    const commenters = await db.execute<{
      post_id: number;
      author_id: number;
      name: string;
      avatar_url: string | null;
    }>(sql`
      select sub.post_id, sub.author_id, u.name, u.avatar_url
      from (
        select distinct on (c.post_id, c.author_id)
               c.post_id, c.author_id, c.created_at
        from ${commentsTable} c
        where c.post_id in (${sql.join(postIds.map((id) => sql`${id}`), sql`, `)})
        order by c.post_id, c.author_id, c.created_at desc
      ) sub
      join ${usersTable} u on u.id = sub.author_id
      order by sub.post_id, sub.created_at desc
    `);
    const raw = (commenters.rows ?? commenters ?? []) as Array<{
      post_id: number;
      author_id: number;
      name: string;
      avatar_url: string | null;
    }>;
    for (const r of raw) {
      const arr = commentersByPost[r.post_id] ?? [];
      if (arr.length < 3) {
        arr.push({ id: r.author_id, name: r.name, avatarUrl: r.avatar_url });
        commentersByPost[r.post_id] = arr;
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    recentCommenters: commentersByPost[r.id] ?? [],
  })) as PostWithMeta[];
}

export async function createPost(
  channelId: number,
  authorId: number,
  body: string,
  loomUrl: string | null,
): Promise<PostWithMeta> {
  const rows = await db
    .insert(postsTable)
    .values({ channelId, authorId, body, loomUrl })
    .returning();
  const post = rows[0]!;
  const user = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  return {
    ...post,
    authorName: user[0]?.name ?? "Unknown",
    authorAvatarUrl: user[0]?.avatarUrl ?? null,
    commentCount: 0,
    likeCount: 0,
    likedByMe: false,
    lastCommentAt: null,
    recentCommenters: [],
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
