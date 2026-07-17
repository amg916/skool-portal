import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "../schema/index.js";

const url = process.env.DATABASE_URL_TEST;

if (!url) {
  throw new Error("DATABASE_URL_TEST must be set to run tests");
}

// Guard against a truncate helper ever pointing at a real database.
if (!/baingers_test/.test(url)) {
  throw new Error(
    `Refusing to run tests against a database whose name is not baingers_test`,
  );
}

const { Pool } = pg;

export const testPool = new Pool({ connectionString: url });
export const testDb = drizzle(testPool, { schema });

export async function truncateAll() {
  await testDb.execute(sql`
    truncate table app_entitlements, app_videos, app_ratings, app_votes, app_modules, apps, app_categories, recordings, users restart identity cascade
  `);
}
