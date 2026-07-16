import { asc } from "drizzle-orm";
import { db, appCategoriesTable } from "@workspace/db";

export async function listAppCategories() {
  return db.select().from(appCategoriesTable).orderBy(asc(appCategoriesTable.sortOrder));
}
