import { eq } from "drizzle-orm";
import { db, uploadsTable } from "@workspace/db";
import type { Upload, InsertUpload } from "@workspace/db";

export async function createUploadRecord(data: Omit<InsertUpload, never>): Promise<Upload> {
  const rows = await db.insert(uploadsTable).values(data).returning();
  return rows[0];
}

export async function getUploadById(id: number): Promise<Upload | undefined> {
  const rows = await db.select().from(uploadsTable).where(eq(uploadsTable.id, id)).limit(1);
  return rows[0];
}

export async function deleteUploadRecord(id: number): Promise<void> {
  await db.delete(uploadsTable).where(eq(uploadsTable.id, id));
}
