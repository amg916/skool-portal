import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import {
  db,
  chatsTable,
  chatMessagesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

function pair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

async function findOrCreateChat(meId: number, otherId: number) {
  if (meId === otherId) throw new Error("Cannot DM yourself");
  const [aId, bId] = pair(meId, otherId);
  const existing = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.userAId, aId), eq(chatsTable.userBId, bId)))
    .limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db
    .insert(chatsTable)
    .values({ userAId: aId, userBId: bId })
    .returning();
  return inserted[0]!;
}

router.get("/chats", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const rows = await db.execute<{
    chat_id: number;
    other_id: number;
    other_name: string;
    other_avatar_url: string | null;
    last_message_at: Date;
    last_body: string | null;
    last_sender_id: number | null;
    unread: number;
  }>(sql`
    select c.id as chat_id,
           case when c.user_a_id = ${me} then c.user_b_id else c.user_a_id end as other_id,
           u.name as other_name,
           u.avatar_url as other_avatar_url,
           c.last_message_at as last_message_at,
           (select body from ${chatMessagesTable} m where m.chat_id = c.id order by m.created_at desc limit 1) as last_body,
           (select sender_id from ${chatMessagesTable} m where m.chat_id = c.id order by m.created_at desc limit 1) as last_sender_id,
           (select count(*)::int from ${chatMessagesTable} m where m.chat_id = c.id and m.sender_id <> ${me} and m.read_at is null) as unread
    from ${chatsTable} c
    join ${usersTable} u on u.id = case when c.user_a_id = ${me} then c.user_b_id else c.user_a_id end
    where c.user_a_id = ${me} or c.user_b_id = ${me}
    order by c.last_message_at desc
  `);
  res.json(rows.rows ?? rows ?? []);
});

router.get("/chats/unread/count", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const rows = await db.execute<{ count: number }>(sql`
    select count(*)::int as count
    from ${chatMessagesTable} m
    join ${chatsTable} c on c.id = m.chat_id
    where (c.user_a_id = ${me} or c.user_b_id = ${me})
      and m.sender_id <> ${me}
      and m.read_at is null
  `);
  const row = (rows.rows ?? rows ?? [])[0] as { count: number } | undefined;
  res.json({ count: row?.count ?? 0 });
});

router.get("/chats/with/:userId", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const otherId = Number(req.params.userId);
  if (!Number.isInteger(otherId) || otherId === me) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const otherRow = await db.select().from(usersTable).where(eq(usersTable.id, otherId)).limit(1);
  if (!otherRow[0] || !otherRow[0].isActive) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const chat = await findOrCreateChat(me, otherId);
  const messages = await db
    .select({
      id: chatMessagesTable.id,
      chatId: chatMessagesTable.chatId,
      senderId: chatMessagesTable.senderId,
      body: chatMessagesTable.body,
      createdAt: chatMessagesTable.createdAt,
      readAt: chatMessagesTable.readAt,
    })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.chatId, chat.id))
    .orderBy(asc(chatMessagesTable.createdAt))
    .limit(200);
  await db
    .update(chatMessagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(chatMessagesTable.chatId, chat.id),
        isNull(chatMessagesTable.readAt),
        sql`${chatMessagesTable.senderId} <> ${me}`,
      ),
    );
  res.json({
    chatId: chat.id,
    other: {
      id: otherRow[0].id,
      name: otherRow[0].name,
      avatarUrl: otherRow[0].avatarUrl,
    },
    messages,
  });
});

router.post("/chats/with/:userId/messages", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const otherId = Number(req.params.userId);
  if (!Number.isInteger(otherId) || otherId === me) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body || body.length > 2000) {
    res.status(400).json({ error: "Body required, max 2000 chars" });
    return;
  }
  const chat = await findOrCreateChat(me, otherId);
  const inserted = await db
    .insert(chatMessagesTable)
    .values({ chatId: chat.id, senderId: me, body })
    .returning();
  await db
    .update(chatsTable)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatsTable.id, chat.id));
  res.status(201).json(inserted[0]);
});

export default router;
