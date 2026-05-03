import { eq, asc } from "drizzle-orm";
import { db, channelsTable } from "@workspace/db";
import type { Channel, InsertChannel } from "@workspace/db";

export async function listChannels(): Promise<Channel[]> {
  return db.select().from(channelsTable).orderBy(asc(channelsTable.sortOrder));
}

export async function createChannel(data: Omit<InsertChannel, "sortOrder">): Promise<Channel> {
  const existing = await listChannels();
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), -1);
  const rows = await db
    .insert(channelsTable)
    .values({ ...data, sortOrder: maxOrder + 1 })
    .returning();
  return rows[0];
}

export async function updateChannel(id: number, data: Partial<InsertChannel>): Promise<Channel | undefined> {
  const rows = await db.update(channelsTable).set(data).where(eq(channelsTable.id, id)).returning();
  return rows[0];
}

export async function deleteChannel(id: number): Promise<void> {
  await db.delete(channelsTable).where(eq(channelsTable.id, id));
}

export async function reorderChannel(id: number, direction: "up" | "down"): Promise<void> {
  const channels = await listChannels();
  const idx = channels.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= channels.length) return;

  const a = channels[idx];
  const b = channels[swapIdx];
  await db.update(channelsTable).set({ sortOrder: b.sortOrder }).where(eq(channelsTable.id, a.id));
  await db.update(channelsTable).set({ sortOrder: a.sortOrder }).where(eq(channelsTable.id, b.id));
}

export async function ensureDefaultAnnouncements(): Promise<void> {
  const existing = await listChannels();
  if (existing.some((c) => c.isDefault)) return;
  await db
    .insert(channelsTable)
    .values({ name: "Announcements", adminsOnly: true, isDefault: true, sortOrder: 0 });
}
