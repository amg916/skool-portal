import { Router, type IRouter } from "express";
import { ilike, sql, eq, and, or } from "drizzle-orm";
import {
  db,
  postsTable,
  usersTable,
  lessonsTable,
  channelsTable,
  recordingsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) {
    res.json({ posts: [], members: [], lessons: [] });
    return;
  }
  const like = `%${q}%`;

  const [posts, members, lessons] = await Promise.all([
    db
      .select({
        id: postsTable.id,
        channelId: postsTable.channelId,
        body: postsTable.body,
        authorId: postsTable.authorId,
        authorName: usersTable.name,
        channelName: channelsTable.name,
        createdAt: postsTable.createdAt,
        // Surface the transcript match so the client can show a transcript
        // snippet in the search dropdown for "ahh, this video covers that".
        transcript: recordingsTable.transcript,
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
      .leftJoin(channelsTable, eq(channelsTable.id, postsTable.channelId))
      .leftJoin(
        recordingsTable,
        eq(recordingsTable.id, postsTable.recordingId),
      )
      .where(
        or(
          ilike(postsTable.body, like),
          ilike(recordingsTable.transcript, like),
        ),
      )
      .limit(8),
    db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(and(eq(usersTable.isActive, true), ilike(usersTable.name, like)))
      .limit(8),
    db
      .select({
        id: lessonsTable.id,
        title: lessonsTable.title,
        subsectionId: lessonsTable.subsectionId,
      })
      .from(lessonsTable)
      .where(ilike(lessonsTable.title, like))
      .limit(8),
  ]);

  res.json({
    posts: posts.map((p) => {
      // If the match came from a transcript only, surface a transcript-anchored
      // snippet so the user sees WHY the post matched.
      const lowerBody = (p.body ?? "").toLowerCase();
      const lowerQ = q.toLowerCase();
      const bodyMatched = lowerBody.includes(lowerQ);
      const transcriptText = (p.transcript ?? "").trim();
      let snippet = p.body.length > 140 ? p.body.slice(0, 140) + "…" : p.body;
      if (!bodyMatched && transcriptText) {
        const i = transcriptText.toLowerCase().indexOf(lowerQ);
        if (i >= 0) {
          const start = Math.max(0, i - 40);
          const end = Math.min(transcriptText.length, i + lowerQ.length + 80);
          snippet =
            (start > 0 ? "…" : "") +
            transcriptText.slice(start, end).trim() +
            (end < transcriptText.length ? "…" : "");
        }
      }
      return {
        id: p.id,
        channelId: p.channelId,
        body: p.body,
        authorId: p.authorId,
        authorName: p.authorName,
        channelName: p.channelName,
        createdAt: p.createdAt,
        snippet,
        transcriptMatch: !bodyMatched && !!transcriptText,
      };
    }),
    members,
    lessons,
  });
});

export default router;
