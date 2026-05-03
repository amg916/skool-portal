import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import { generateSessionToken } from "../lib/auth.js";
import type { Session } from "@workspace/db";

const SESSION_TTL_DAYS = 30;

export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId, token, expiresAt });
  return token;
}

export async function getSessionByToken(token: string): Promise<Session | undefined> {
  const now = new Date();
  const rows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)))
    .limit(1);
  return rows[0];
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}
