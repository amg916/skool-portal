import { eq, asc, sql, and } from "drizzle-orm";
import {
  db,
  postsTable,
  commentsTable,
  likesTable,
  usersTable,
  postBookmarksTable,
  postReactionsTable,
} from "@workspace/db";

export type RecentCommenter = { id: number; name: string; avatarUrl: string | null };
export type ReactionAgg = { emoji: string; count: number; mine: boolean };

export type PostWithMeta = {
  id: number;
  channelId: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  isPinned: boolean;
  loomUrl: string | null;
  videoUrl: string | null;
  videoProvider: string | null;
  videoEmbedId: string | null;
  tags: string[];
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  reactions: ReactionAgg[];
  lastCommentAt: Date | null;
  recentCommenters: RecentCommenter[];
  createdAt: Date;
};

export type CreatePostExtras = {
  videoUrl: string | null;
  videoProvider: "loom" | "youtube" | "vimeo" | "cloudflare-stream" | null;
  videoEmbedId: string | null;
  tags: string[];
};

async function annotatePosts<T extends { id: number }>(rows: T[], viewerId: number): Promise<Record<number, { bookmarked: boolean; reactions: ReactionAgg[] }>> {
  const postIds = rows.map((r) => r.id);
  if (!postIds.length) return {};
  const bookmarks = await db
    .select({ postId: postBookmarksTable.postId })
    .from(postBookmarksTable)
    .where(and(eq(postBookmarksTable.userId, viewerId), sql`${postBookmarksTable.postId} in (${sql.join(postIds.map((id) => sql`${id}`), sql`, `)})`));
  const bookmarkSet = new Set(bookmarks.map((b) => b.postId));

  const reactionRows = await db.execute<{
    post_id: number;
    emoji: string;
    count: number;
    mine: boolean;
  }>(sql`
    select r.post_id,
           r.emoji,
           count(*)::int as count,
           bool_or(r.user_id = ${viewerId}) as mine
    from ${postReactionsTable} r
    where r.post_id in (${sql.join(postIds.map((id) => sql`${id}`), sql`, `)})
    group by r.post_id, r.emoji
    order by count(*) desc
  `);
  const reactionsByPost: Record<number, ReactionAgg[]> = {};
  for (const r of reactionRows.rows ?? reactionRows ?? []) {
    const arr = reactionsByPost[r.post_id] ?? [];
    arr.push({ emoji: r.emoji, count: Number(r.count), mine: !!r.mine });
    reactionsByPost[r.post_id] = arr;
  }
  const out: Record<number, { bookmarked: boolean; reactions: ReactionAgg[] }> = {};
  for (const id of postIds) {
    out[id] = { bookmarked: bookmarkSet.has(id), reactions: reactionsByPost[id] ?? [] };
  }
  return out;
}

export async function listPostsByChannel(
  channelId: number,
  viewerId: number,
  opts?: { tag?: string },
): Promise<PostWithMeta[]> {
  const tagFilter = opts?.tag?.trim().toLowerCase();
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
      videoUrl: postsTable.videoUrl,
      videoProvider: postsTable.videoProvider,
      videoEmbedId: postsTable.videoEmbedId,
      tags: postsTable.tags,
      commentCount: sql<number>`cast((select count(*) from ${commentsTable} c where c.post_id = ${postsTable.id}) as int)`,
      likeCount: sql<number>`cast((select count(*) from ${likesTable} l where l.post_id = ${postsTable.id}) as int)`,
      likedByMe: sql<boolean>`exists(select 1 from ${likesTable} l where l.post_id = ${postsTable.id} and l.user_id = ${viewerId})`,
      lastCommentAt: sql<Date | null>`(select max(c.created_at) from ${commentsTable} c where c.post_id = ${postsTable.id})`,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(
      tagFilter
        ? and(eq(postsTable.channelId, channelId), sql`${tagFilter} = ANY(${postsTable.tags})`)
        : eq(postsTable.channelId, channelId),
    )
    .orderBy(asc(postsTable.createdAt));

  const postIds = rows.map((r) => r.id);
  let commentersByPost: Record<number, RecentCommenter[]> = {};
  if (postIds.length) {
    const commenters = await db.execute<{ post_id: number; author_id: number; name: string; avatar_url: string | null }>(sql`
      select sub.post_id, sub.author_id, u.name, u.avatar_url
      from (
        select distinct on (c.post_id, c.author_id) c.post_id, c.author_id, c.created_at
        from ${commentsTable} c
        where c.post_id in (${sql.join(postIds.map((id) => sql`${id}`), sql`, `)})
        order by c.post_id, c.author_id, c.created_at desc
      ) sub
      join ${usersTable} u on u.id = sub.author_id
      order by sub.post_id, sub.created_at desc
    `);
    for (const r of (commenters.rows ?? commenters ?? []) as Array<{ post_id: number; author_id: number; name: string; avatar_url: string | null }>) {
      const arr = commentersByPost[r.post_id] ?? [];
      if (arr.length < 3) {
        arr.push({ id: r.author_id, name: r.name, avatarUrl: r.avatar_url });
        commentersByPost[r.post_id] = arr;
      }
    }
  }

  const extras = await annotatePosts(rows, viewerId);

  return rows.map((r) => ({
    ...r,
    tags: r.tags ?? [],
    recentCommenters: commentersByPost[r.id] ?? [],
    bookmarkedByMe: extras[r.id]?.bookmarked ?? false,
    reactions: extras[r.id]?.reactions ?? [],
  })) as PostWithMeta[];
}

export async function createPost(
  channelId: number,
  authorId: number,
  body: string,
  loomUrl: string | null,
  extras: CreatePostExtras = { videoUrl: null, videoProvider: null, videoEmbedId: null, tags: [] },
): Promise<PostWithMeta> {
  const rows = await db
    .insert(postsTable)
    .values({
      channelId,
      authorId,
      body,
      loomUrl,
      videoUrl: extras.videoUrl,
      videoProvider: extras.videoProvider,
      videoEmbedId: extras.videoEmbedId,
      tags: extras.tags.length ? extras.tags : null,
    })
    .returning();
  const post = rows[0]!;
  const user = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  return {
    ...post,
    tags: post.tags ?? [],
    authorName: user[0]?.name ?? "Unknown",
    authorAvatarUrl: user[0]?.avatarUrl ?? null,
    commentCount: 0,
    likeCount: 0,
    likedByMe: false,
    bookmarkedByMe: false,
    reactions: [],
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
