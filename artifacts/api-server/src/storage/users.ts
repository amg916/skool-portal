import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword, generateTempPassword } from "../lib/auth.js";
import type { User } from "@workspace/db";

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  return rows[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return rows[0];
}

export async function createUserWithTempPassword(
  email: string,
  name: string,
  role: "admin" | "member"
): Promise<{ user: User; tempPassword: string }> {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const rows = await db
    .insert(usersTable)
    .values({ email, name, role, passwordHash, forcePasswordChange: true, isActive: true })
    .returning();
  return { user: rows[0], tempPassword };
}

export async function setUserPassword(userId: number, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash, forcePasswordChange: false })
    .where(eq(usersTable.id, userId));
}

export async function setForcePasswordChange(userId: number, force: boolean): Promise<void> {
  await db.update(usersTable).set({ forcePasswordChange: force }).where(eq(usersTable.id, userId));
}

export async function listUsers(): Promise<User[]> {
  return db.select().from(usersTable).orderBy(usersTable.createdAt);
}

export async function deactivateUser(userId: number): Promise<void> {
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, userId));
}

export async function resetUserPassword(userId: number): Promise<string> {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await db
    .update(usersTable)
    .set({ passwordHash, forcePasswordChange: true })
    .where(eq(usersTable.id, userId));
  return tempPassword;
}
