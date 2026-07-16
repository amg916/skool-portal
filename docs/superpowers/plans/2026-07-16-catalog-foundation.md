# Catalog Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the app catalog — `apps`, `app_categories`, `app_modules` — seeded with AMG's first-party apps, browsable at `/apps` and readable at `/apps/:slug`, with link-out CTAs and R2-backed icons.

**Architecture:** This is a **contract-first** codebase. `lib/api-spec/openapi.yaml` is the source of truth; orval generates zod validators into `@workspace/api-zod` and react-query hooks into `@workspace/api-client-react`. Both generated dirs are `clean: true` — **hand-edits are wiped on next codegen**. Every endpoint starts in the YAML. Server routes stay thin and delegate to `src/storage/*.ts`.

**Tech Stack:** pnpm workspace · Drizzle ORM + node-postgres · Express 5 · Vite + React + wouter · TanStack Query · shadcn/ui + Radix + Tailwind · lucide-react · orval · vitest (this plan introduces it)

---

## Critical context (read before Task 1)

**The database is NOT Neon.** `CLAUDE.md` says Neon; it is wrong. Production is Postgres on the Mac mini: `postgresql://amgapp:***@db.amgcc.space:5432`. There is no Neon branching, so test DBs are real databases on that host. Pin `:5432` explicitly — prime has a local PG16 cluster on 5433 that hijacks portless URLs.

**There are zero tests in this repo.** No vitest, no jest, no test files, no test script. Task 1 builds the harness. Do not skip it — every later task's TDD loop depends on it.

**Production holds 6 users and 7 posts.** It is a prototype. Restructure directly; do not write backward-compatibility shims.

**Auth pattern:** every existing read route uses `requireAuth`. The catalog follows that — members-only, matching the invite-only posture. Public/SEO browse is a deliberate later decision, not an oversight.

**Page filenames are lowercase-kebab** (`community.tsx`, `school-segment.tsx`). The spec said `Apps.tsx`; the spec was wrong. Use `apps.tsx` and `app-detail.tsx`.

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` (root) | Test runner config, workspace-wide |
| `lib/db/src/testing/harness.ts` | Test DB connect + truncate helpers |
| `lib/db/src/schema/app_categories.ts` | Category table + zod |
| `lib/db/src/schema/apps.ts` | App table + zod |
| `lib/db/src/schema/app_modules.ts` | Module table + zod |
| `lib/db/drizzle/*.sql` | Generated migrations (new) |
| `lib/api-spec/openapi.yaml` | **Contract — edit first, always** |
| `artifacts/api-server/src/storage/apps.ts` | All catalog queries |
| `artifacts/api-server/src/storage/apps.test.ts` | Storage tests |
| `artifacts/api-server/src/lib/objectStore.ts` | R2 interface + impl |
| `artifacts/api-server/src/routes/apps.ts` | Public + admin routes |
| `artifacts/api-server/src/seed/apps.ts` | Idempotent first-party seed |
| `artifacts/portal/src/pages/apps.tsx` | Browse (= Explore surface) |
| `artifacts/portal/src/pages/app-detail.tsx` | Detail |
| `artifacts/portal/src/components/apps/app-card.tsx` | Card |
| `artifacts/portal/src/components/apps/category-rail.tsx` | Category filter |
| `artifacts/portal/src/components/apps/module-list.tsx` | Modules; renders null when empty |

---

### Task 1: Test harness

No tests exist. This unblocks every following task.

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/db/src/testing/harness.ts`
- Modify: `package.json` (root), `artifacts/api-server/package.json`

- [ ] **Step 1: Create the test database**

```bash
psql "postgresql://amgapp:PASSWORD@db.amgcc.space:5432/postgres" \
  -c "CREATE DATABASE baingers_test;"
```

Add to `/home/ubuntu/env/skool-portal.env` on prime and to your local shell:
```
DATABASE_URL_TEST=postgresql://amgapp:PASSWORD@db.amgcc.space:5432/baingers_test
```

- [ ] **Step 2: Install vitest**

```bash
pnpm add -Dw vitest
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    fileParallelism: false, // single shared test DB
  },
});
```

`fileParallelism: false` matters: all suites share one database, and parallel truncates would race.

- [ ] **Step 4: Write `lib/db/src/testing/harness.ts`**

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "../schema/index.js";

const url = process.env.DATABASE_URL_TEST;
if (!url) throw new Error("DATABASE_URL_TEST must be set to run tests");
if (!/baingers_test/.test(url)) {
  throw new Error(`Refusing to run tests against ${url} — name must contain baingers_test`);
}

export const testPool = new pg.Pool({ connectionString: url });
export const testDb = drizzle(testPool, { schema });

export async function truncateAll() {
  await testDb.execute(sql`
    truncate table app_modules, apps, app_categories restart identity cascade
  `);
}
```

The name guard is deliberate. A truncate helper pointed at production is a data-loss incident; this makes that impossible.

- [ ] **Step 5: Add scripts**

Root `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Verify the harness fails cleanly without a DB**

Run: `pnpm test`
Expected: exits 0, "No test files found" — harness present, nothing to run yet.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json lib/db/src/testing/harness.ts pnpm-lock.yaml
git commit -m "test: add vitest harness with test-db name guard"
```

---

### Task 2: Migration history baseline

Today: `push` only, no `out` dir, no SQL artifact, no rollback. Install history **now**, while the DB holds 7 posts.

**Files:**
- Modify: `lib/db/drizzle.config.ts`, `lib/db/package.json`, `README.md`

- [ ] **Step 1: Add `out` to `drizzle.config.ts`**

```ts
export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
});
```

- [ ] **Step 2: Add scripts to `lib/db/package.json`**

```json
"generate": "drizzle-kit generate --config ./drizzle.config.ts",
"migrate": "drizzle-kit migrate --config ./drizzle.config.ts",
"push": "drizzle-kit push --config ./drizzle.config.ts"
```

Drop `push-force` entirely — it silently accepts destructive changes and has no place in a repo with a production DB.

- [ ] **Step 3: Generate the baseline from the existing 21 tables**

```bash
cd lib/db && pnpm run generate
```
Expected: `lib/db/drizzle/0000_*.sql` containing CREATE TABLE for all 21 existing tables.

- [ ] **Step 4: Verify the baseline reproduces production exactly**

```bash
psql "$DATABASE_URL_TEST" -c "drop schema public cascade; create schema public;"
DATABASE_URL="$DATABASE_URL_TEST" pnpm run migrate
psql "$DATABASE_URL_TEST" -tAc "select tablename from pg_tables where schemaname='public' order by 1" > /tmp/test_tables.txt
psql "$DATABASE_URL"      -tAc "select tablename from pg_tables where schemaname='public' order by 1" > /tmp/prod_tables.txt
diff /tmp/test_tables.txt /tmp/prod_tables.txt && echo "BASELINE MATCHES PROD"
```
Expected: `BASELINE MATCHES PROD`. **If it differs, stop and reconcile before continuing** — a wrong baseline corrupts every later migration.

- [ ] **Step 5: Mark the baseline as applied on production**

The 21 tables already exist on prod, so the baseline must be recorded, not run:
```bash
DATABASE_URL="$DATABASE_URL" pnpm exec drizzle-kit migrate --config ./drizzle.config.ts
```
Drizzle creates `__drizzle_migrations` and, since the tables exist, will error on CREATE. If it does, insert the baseline hash manually:
```bash
psql "$DATABASE_URL" -c "create schema if not exists drizzle;"
psql "$DATABASE_URL" -c "create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint);"
psql "$DATABASE_URL" -c "insert into drizzle.__drizzle_migrations (hash, created_at) values ('<hash from lib/db/drizzle/meta/_journal.json>', extract(epoch from now())*1000);"
```
Verify: `psql "$DATABASE_URL" -c "select * from drizzle.__drizzle_migrations;"` returns one row.

- [ ] **Step 6: Fix the two README bugs**

README:46 references `pnpm --filter @workspace/api-server run seed` — that script does not exist (fixed in Task 10). README:79 calls `lib/db/` "Drizzle schema & migrations" — true only as of this task. Update both, and document: **deploys run `migrate`, never `push`. `push` is local scratch only.**

- [ ] **Step 7: Commit**

```bash
git add lib/db/drizzle.config.ts lib/db/package.json lib/db/drizzle README.md
git commit -m "build(db): add migration history, baseline 21 tables, drop push-force"
```

---

### Task 3: `app_categories` schema

**Files:**
- Create: `lib/db/src/schema/app_categories.ts`
- Modify: `lib/db/src/schema/index.ts`

- [ ] **Step 1: Write the schema** (mirrors `channels.ts` exactly)

```ts
import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appCategoriesTable = pgTable("app_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppCategorySchema = createInsertSchema(appCategoriesTable).omit({ id: true, createdAt: true });
export type InsertAppCategory = z.infer<typeof insertAppCategorySchema>;
export type AppCategory = typeof appCategoriesTable.$inferSelect;
```

- [ ] **Step 2: Export it**

Add to `lib/db/src/schema/index.ts`: `export * from "./app_categories";`

- [ ] **Step 3: Typecheck**

Run: `pnpm run typecheck:libs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/db/src/schema/app_categories.ts lib/db/src/schema/index.ts
git commit -m "feat(db): add app_categories schema"
```

---

### Task 4: `apps` and `app_modules` schema

**Files:**
- Create: `lib/db/src/schema/apps.ts`, `lib/db/src/schema/app_modules.ts`
- Modify: `lib/db/src/schema/index.ts`

- [ ] **Step 1: Write `apps.ts`**

```ts
import { pgTable, serial, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { appCategoriesTable } from "./app_categories";

export const APP_STAGES = ["submitted", "incubating", "graduated", "retired", "rejected"] as const;
export const APP_ACCESS_TYPES = ["link_out", "provisioned"] as const;

export const appsTable = pgTable("apps", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  categoryId: integer("category_id").notNull().references(() => appCategoriesTable.id, { onDelete: "restrict" }),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  isFirstParty: boolean("is_first_party").notNull().default(false),
  stage: text("stage", { enum: APP_STAGES }).notNull().default("submitted"),
  accessType: text("access_type", { enum: APP_ACCESS_TYPES }).notNull().default("link_out"),
  externalUrl: text("external_url"),
  iconUrl: text("icon_url"),
  screenshots: text("screenshots").array().notNull().default([]),
  graduatedAt: timestamp("graduated_at"),
  graduatedBy: integer("graduated_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  stageIdx: index("apps_stage_idx").on(t.stage),
  categoryIdx: index("apps_category_idx").on(t.categoryId),
  ownerIdx: index("apps_owner_idx").on(t.ownerId),
}));

export const insertAppSchema = createInsertSchema(appsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApp = z.infer<typeof insertAppSchema>;
export type App = typeof appsTable.$inferSelect;
export type AppStage = (typeof APP_STAGES)[number];
```

`category_id` is `restrict`, not `cascade`: deleting a category must never silently delete the apps filed under it.

- [ ] **Step 2: Write `app_modules.ts`**

```ts
import { pgTable, serial, text, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";

export const appModulesTable = pgTable("app_modules", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => appsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  appIdx: index("app_modules_app_idx").on(t.appId),
}));

export const insertAppModuleSchema = createInsertSchema(appModulesTable).omit({ id: true });
export type InsertAppModule = z.infer<typeof insertAppModuleSchema>;
export type AppModule = typeof appModulesTable.$inferSelect;
```

- [ ] **Step 3: Export both**

Add to `lib/db/src/schema/index.ts`:
```ts
export * from "./apps";
export * from "./app_modules";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm run typecheck:libs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/db/src/schema/ && git commit -m "feat(db): add apps + app_modules schema"
```

---

### Task 5: Generate and apply the catalog migration

**Files:**
- Create: `lib/db/drizzle/0001_*.sql`

- [ ] **Step 1: Generate**

```bash
cd lib/db && pnpm run generate
```
Expected: `0001_*.sql` with CREATE TABLE for `app_categories`, `apps`, `app_modules`.

- [ ] **Step 2: Add the `stage` CHECK constraint by hand**

Drizzle's `{ enum: [...] }` is compile-time only — every existing enum in this schema is an unconstrained `text` column at the DB level. `stage` gates who can vote (Spec 2) and rate (Spec 3), so it gets a real constraint. Append to the generated `0001_*.sql`:

```sql
ALTER TABLE "apps" ADD CONSTRAINT "apps_stage_check"
  CHECK ("stage" IN ('submitted','incubating','graduated','retired','rejected'));
ALTER TABLE "apps" ADD CONSTRAINT "apps_access_type_check"
  CHECK ("access_type" IN ('link_out','provisioned'));
```

- [ ] **Step 3: Apply to the test DB**

```bash
DATABASE_URL="$DATABASE_URL_TEST" pnpm run migrate
```
Expected: applies cleanly.

- [ ] **Step 4: Prove the CHECK constraint bites**

```bash
psql "$DATABASE_URL_TEST" -c "insert into apps (slug,name,category_id,owner_id,stage) values ('x','X',1,1,'bogus');"
```
Expected: `ERROR: new row violates check constraint "apps_stage_check"`. If it inserts, the constraint did not apply — fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add lib/db/drizzle
git commit -m "feat(db): catalog migration with stage/access_type CHECK constraints"
```

---

### Task 6: OpenAPI contract + codegen

**Contract first.** Writing routes before this means hand-writing validators that codegen will overwrite, and portal hooks that will not exist.

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add the `apps` tag**

Under `tags:` in `openapi.yaml`:
```yaml
  - name: apps
    description: App catalog
```

- [ ] **Step 2: Add schemas** under `components.schemas`

```yaml
    AppCategory:
      type: object
      required: [id, slug, name, sortOrder]
      properties:
        id: { type: integer }
        slug: { type: string }
        name: { type: string }
        description: { type: string, nullable: true }
        icon: { type: string, nullable: true }
        sortOrder: { type: integer }
    AppModule:
      type: object
      required: [id, name, sortOrder]
      properties:
        id: { type: integer }
        name: { type: string }
        description: { type: string, nullable: true }
        sortOrder: { type: integer }
    AppSummary:
      type: object
      required: [id, slug, name, categoryId, stage, accessType, isFirstParty]
      properties:
        id: { type: integer }
        slug: { type: string }
        name: { type: string }
        tagline: { type: string, nullable: true }
        categoryId: { type: integer }
        categorySlug: { type: string }
        iconUrl: { type: string, nullable: true }
        stage: { type: string, enum: [submitted, incubating, graduated, retired, rejected] }
        accessType: { type: string, enum: [link_out, provisioned] }
        isFirstParty: { type: boolean }
    AppDetail:
      allOf:
        - $ref: "#/components/schemas/AppSummary"
        - type: object
          properties:
            description: { type: string, nullable: true }
            externalUrl: { type: string, nullable: true }
            screenshots: { type: array, items: { type: string } }
            modules: { type: array, items: { $ref: "#/components/schemas/AppModule" } }
    CreateAppBody:
      type: object
      required: [slug, name, categoryId]
      properties:
        slug: { type: string, minLength: 1, pattern: "^[a-z0-9-]+$" }
        name: { type: string, minLength: 1 }
        tagline: { type: string }
        description: { type: string }
        categoryId: { type: integer }
        externalUrl: { type: string }
        isFirstParty: { type: boolean }
        stage: { type: string, enum: [submitted, incubating, graduated, retired, rejected] }
        accessType: { type: string, enum: [link_out, provisioned] }
    UpdateAppBody:
      type: object
      properties:
        name: { type: string }
        tagline: { type: string }
        description: { type: string }
        categoryId: { type: integer }
        externalUrl: { type: string }
        stage: { type: string, enum: [submitted, incubating, graduated, retired, rejected] }
```

- [ ] **Step 3: Add paths**

```yaml
  /app-categories:
    get:
      operationId: listAppCategories
      tags: [apps]
      responses:
        "200":
          description: Categories
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/AppCategory" } }
  /apps:
    get:
      operationId: listApps
      tags: [apps]
      parameters:
        - { name: category, in: query, schema: { type: string } }
        - { name: stage, in: query, schema: { type: string, enum: [submitted, incubating, graduated, retired, rejected] } }
        - { name: q, in: query, schema: { type: string } }
      responses:
        "200":
          description: Apps
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/AppSummary" } }
  /apps/{slug}:
    get:
      operationId: getApp
      tags: [apps]
      parameters:
        - { name: slug, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: App
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AppDetail" }
        "404": { description: Not found }
  /admin/apps:
    post:
      operationId: createApp
      tags: [apps, admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CreateAppBody" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AppDetail" }
  /admin/apps/{id}:
    patch:
      operationId: updateApp
      tags: [apps, admin]
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/UpdateAppBody" }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AppDetail" }
        "404": { description: Not found }
    delete:
      operationId: retireApp
      tags: [apps, admin]
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        "204": { description: Retired }
```

- [ ] **Step 4: Run codegen**

```bash
pnpm --filter @workspace/api-spec run codegen
```
Expected: regenerates `lib/api-zod/src/generated/` and `lib/api-client-react/src/generated/`, then typechecks.

- [ ] **Step 5: Verify the generated symbols exist**

```bash
grep -rn "CreateAppBody\|listApps" lib/api-zod/src/generated/ | head
grep -rn "useListApps\|useGetApp" lib/api-client-react/src/generated/ | head
```
Expected: hits in both. These are the exact names Tasks 8, 11, and 12 import.

- [ ] **Step 6: Commit**

```bash
git add lib/api-spec/openapi.yaml lib/api-zod lib/api-client-react
git commit -m "feat(api): add app catalog contract + regenerate clients"
```

---

### Task 7: Storage layer (TDD)

**Files:**
- Create: `artifacts/api-server/src/storage/apps.ts`, `artifacts/api-server/src/storage/apps.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { testDb, truncateAll } from "@workspace/db/testing/harness";
import { appCategoriesTable, appsTable, appModulesTable, usersTable } from "@workspace/db";
import { listApps, getAppBySlug, retireApp } from "./apps.js";

let ownerId: number;
let marketingId: number;

beforeEach(async () => {
  await truncateAll();
  const [u] = await testDb.insert(usersTable).values({ email: "a@b.co", name: "Owner", role: "admin" }).returning();
  ownerId = u!.id;
  const [c] = await testDb.insert(appCategoriesTable).values({ slug: "marketing", name: "Marketing" }).returning();
  marketingId = c!.id;
});

describe("listApps", () => {
  it("returns only graduated apps by default", async () => {
    await testDb.insert(appsTable).values([
      { slug: "live", name: "Live", categoryId: marketingId, ownerId, stage: "graduated" },
      { slug: "pending", name: "Pending", categoryId: marketingId, ownerId, stage: "submitted" },
    ]);
    const rows = await listApps({});
    expect(rows.map((r) => r.slug)).toEqual(["live"]);
  });

  it("filters by category slug", async () => {
    const [admin] = await testDb.insert(appCategoriesTable).values({ slug: "admin", name: "Admin" }).returning();
    await testDb.insert(appsTable).values([
      { slug: "mk", name: "Mk", categoryId: marketingId, ownerId, stage: "graduated" },
      { slug: "ad", name: "Ad", categoryId: admin!.id, ownerId, stage: "graduated" },
    ]);
    const rows = await listApps({ category: "admin" });
    expect(rows.map((r) => r.slug)).toEqual(["ad"]);
  });
});

describe("getAppBySlug", () => {
  it("returns modules ordered by sortOrder", async () => {
    const [app] = await testDb.insert(appsTable).values({
      slug: "omnisend", name: "Omnisend", categoryId: marketingId, ownerId, stage: "graduated",
    }).returning();
    await testDb.insert(appModulesTable).values([
      { appId: app!.id, name: "Android SMS", sortOrder: 2 },
      { appId: app!.id, name: "Push", sortOrder: 0 },
      { appId: app!.id, name: "Email", sortOrder: 1 },
    ]);
    const found = await getAppBySlug("omnisend");
    expect(found?.modules.map((m) => m.name)).toEqual(["Push", "Email", "Android SMS"]);
  });

  it("returns null for unknown slug", async () => {
    expect(await getAppBySlug("nope")).toBeNull();
  });
});

describe("retireApp", () => {
  it("sets stage to retired without deleting the row", async () => {
    const [app] = await testDb.insert(appsTable).values({
      slug: "old", name: "Old", categoryId: marketingId, ownerId, stage: "graduated",
    }).returning();
    await retireApp(app!.id);
    const rows = await testDb.select().from(appsTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.stage).toBe("retired");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test artifacts/api-server/src/storage/apps.test.ts`
Expected: FAIL — cannot resolve `./apps.js`.

- [ ] **Step 3: Implement `storage/apps.ts`**

```ts
import { eq, and, asc, ilike, sql } from "drizzle-orm";
import { db, appsTable, appCategoriesTable, appModulesTable, type AppStage } from "@workspace/db";

export type AppSummary = {
  id: number; slug: string; name: string; tagline: string | null;
  categoryId: number; categorySlug: string; iconUrl: string | null;
  stage: string; accessType: string; isFirstParty: boolean;
};
export type AppModuleView = { id: number; name: string; description: string | null; sortOrder: number };
export type AppDetail = AppSummary & {
  description: string | null; externalUrl: string | null;
  screenshots: string[]; modules: AppModuleView[];
};

const summaryCols = {
  id: appsTable.id, slug: appsTable.slug, name: appsTable.name, tagline: appsTable.tagline,
  categoryId: appsTable.categoryId, categorySlug: appCategoriesTable.slug,
  iconUrl: appsTable.iconUrl, stage: appsTable.stage, accessType: appsTable.accessType,
  isFirstParty: appsTable.isFirstParty,
};

export async function listApps(opts: { category?: string; stage?: AppStage; q?: string }): Promise<AppSummary[]> {
  const filters = [eq(appsTable.stage, opts.stage ?? "graduated")];
  if (opts.category) filters.push(eq(appCategoriesTable.slug, opts.category));
  if (opts.q) filters.push(ilike(appsTable.name, `%${opts.q}%`));
  return db.select(summaryCols).from(appsTable)
    .innerJoin(appCategoriesTable, eq(appsTable.categoryId, appCategoriesTable.id))
    .where(and(...filters))
    .orderBy(asc(appCategoriesTable.sortOrder), asc(appsTable.name));
}

export async function getAppBySlug(slug: string): Promise<AppDetail | null> {
  const [row] = await db.select({
    ...summaryCols,
    description: appsTable.description,
    externalUrl: appsTable.externalUrl,
    screenshots: appsTable.screenshots,
  }).from(appsTable)
    .innerJoin(appCategoriesTable, eq(appsTable.categoryId, appCategoriesTable.id))
    .where(eq(appsTable.slug, slug));
  if (!row) return null;
  const modules = await db.select({
    id: appModulesTable.id, name: appModulesTable.name,
    description: appModulesTable.description, sortOrder: appModulesTable.sortOrder,
  }).from(appModulesTable)
    .where(eq(appModulesTable.appId, row.id))
    .orderBy(asc(appModulesTable.sortOrder));
  return { ...row, modules };
}

export async function retireApp(id: number): Promise<void> {
  await db.update(appsTable).set({ stage: "retired", updatedAt: new Date() }).where(eq(appsTable.id, id));
}
```

- [ ] **Step 4: Point storage at the test DB**

The tests import `db` transitively. Add to `vitest.config.ts`:
```ts
test: {
  env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  // ...existing keys
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test artifacts/api-server/src/storage/apps.test.ts`
Expected: 5 passing.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/storage/apps.ts artifacts/api-server/src/storage/apps.test.ts vitest.config.ts
git commit -m "feat(api): app catalog storage layer"
```

---

### Task 8: Routes

**Files:**
- Create: `artifacts/api-server/src/routes/apps.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`

- [ ] **Step 1: Write `routes/apps.ts`** (mirrors `routes/channels.ts`)

```ts
import { Router } from "express";
import { listApps, getAppBySlug, retireApp } from "../storage/apps.js";
import { listAppCategories } from "../storage/appCategories.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/app-categories", requireAuth, async (_req, res) => {
  res.json(await listAppCategories());
});

router.get("/apps", requireAuth, async (req, res) => {
  const { category, stage, q } = req.query as Record<string, string | undefined>;
  res.json(await listApps({ category, stage: stage as never, q }));
});

router.get("/apps/:slug", requireAuth, async (req, res) => {
  const app = await getAppBySlug(req.params.slug);
  if (!app) { res.status(404).json({ error: "Not found" }); return; }
  res.json(app);
});

router.delete("/admin/apps/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await retireApp(id);
  res.status(204).send();
});

export default router;
```

`POST`/`PATCH` admin routes use `validateBody(CreateAppBody)` / `validateBody(UpdateAppBody)` from `@workspace/api-zod` — same shape as `routes/channels.ts:15`.

- [ ] **Step 2: Create `storage/appCategories.ts`**

```ts
import { asc } from "drizzle-orm";
import { db, appCategoriesTable } from "@workspace/db";

export async function listAppCategories() {
  return db.select().from(appCategoriesTable).orderBy(asc(appCategoriesTable.sortOrder));
}
```

- [ ] **Step 3: Mount the router**

In `artifacts/api-server/src/routes/index.ts`, add the import alongside the others and `router.use(appsRouter);` with the rest:
```ts
import appsRouter from "./apps.js";
// ...
router.use(appsRouter);
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @workspace/api-server run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/routes/apps.ts artifacts/api-server/src/routes/index.ts artifacts/api-server/src/storage/appCategories.ts
git commit -m "feat(api): app catalog routes"
```

---

### Task 9: R2 object store

Local-disk uploads are wiped on every prime redeploy. Icons need durable storage.

**Files:**
- Create: `artifacts/api-server/src/lib/objectStore.ts`
- Modify: `artifacts/api-server/src/routes/apps.ts`, `/home/ubuntu/env/skool-portal.env`

- [ ] **Step 1: Create the R2 bucket + token**

Cloudflare dashboard → R2 → create bucket `baingers-assets` → enable public access → create an S3-compatible API token. Add to `/home/ubuntu/env/skool-portal.env`:
```
R2_ACCOUNT_ID=feec3c2b9eace123598131eee7fe86bd
R2_ACCESS_KEY_ID=<token id>
R2_SECRET_ACCESS_KEY=<token secret>
R2_BUCKET=baingers-assets
R2_PUBLIC_BASE=https://<public-r2-domain>
```

- [ ] **Step 2: Install the S3 client**

```bash
pnpm --filter @workspace/api-server add @aws-sdk/client-s3
```

- [ ] **Step 3: Write `lib/objectStore.ts`**

```ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
}

class R2Store implements ObjectStore {
  private client: S3Client;
  constructor(private bucket: string, private publicBase: string, accountId: string, accessKeyId: string, secretAccessKey: string) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
    return `${this.publicBase}/${key}`;
  }
}

export function createObjectStore(): ObjectStore {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE) {
    throw new Error("R2_* env vars must be set for object storage");
  }
  return new R2Store(R2_BUCKET, R2_PUBLIC_BASE, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY);
}
```

- [ ] **Step 4: Add the icon upload route** to `routes/apps.ts`

Use `multer` memory storage (already a dependency), 2MB cap, PNG/JPEG/WEBP/SVG only, admin-gated — mirroring the filter in `routes/uploads.ts:27-33`. Key: `app-icons/${id}-${Date.now()}.${ext}`. Write the returned URL to `apps.icon_url`.

- [ ] **Step 5: Verify a real round-trip**

Upload an icon via the admin route, then `curl -I` the returned URL.
Expected: `HTTP/2 200` with an `image/*` content-type. **This must be a real HTTP check, not an assumption.**

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/lib/objectStore.ts artifacts/api-server/src/routes/apps.ts artifacts/api-server/package.json pnpm-lock.yaml
git commit -m "feat(api): R2 object store for app icons"
```

---

### Task 10: Seed

**Files:**
- Create: `artifacts/api-server/src/seed/apps.ts`
- Modify: `artifacts/api-server/package.json`

- [ ] **Step 1: Write the seed** — idempotent, keyed on slug

```ts
import { db, appCategoriesTable, appsTable, appModulesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CATEGORIES = [
  { slug: "marketing", name: "Marketing", icon: "Megaphone", sortOrder: 0 },
  { slug: "admin", name: "Admin", icon: "Settings", sortOrder: 1 },
  { slug: "logistics", name: "Logistics", icon: "Truck", sortOrder: 2 },
  { slug: "tracking", name: "Tracking", icon: "Activity", sortOrder: 3 },
];

const APPS: Array<{ slug: string; name: string; category: string; tagline: string; url: string | null; modules?: string[] }> = [
  { slug: "omnisend", name: "Omnisend", category: "marketing", tagline: "TODO", url: null, modules: ["Push", "Email", "Android SMS"] },
  { slug: "command-center", name: "Command Center", category: "admin", tagline: "TODO", url: null },
  { slug: "employee-tracker", name: "Employee Tracker", category: "admin", tagline: "TODO", url: null },
  { slug: "trackdrive", name: "TrackDrive", category: "tracking", tagline: "TODO", url: null },
  { slug: "overflow", name: "Overflow", category: "logistics", tagline: "TODO", url: null },
  { slug: "kingdom", name: "Kingdom", category: "marketing", tagline: "TODO", url: null, modules: ["Funnel Jacker"] },
  { slug: "content-studio", name: "Content Studio", category: "marketing", tagline: "TODO", url: null },
  { slug: "freegaime", name: "Freegaime", category: "marketing", tagline: "TODO", url: null },
  { slug: "patent-searcher", name: "Patent Searcher", category: "admin", tagline: "TODO", url: null },
  { slug: "quickbooks", name: "QuickBooks", category: "admin", tagline: "TODO", url: null },
  { slug: "unibox", name: "Unibox", category: "marketing", tagline: "TODO", url: null },
];

export async function seedApps() {
  for (const c of CATEGORIES) {
    await db.insert(appCategoriesTable).values(c).onConflictDoUpdate({
      target: appCategoriesTable.slug, set: { name: c.name, icon: c.icon, sortOrder: c.sortOrder },
    });
  }
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
  if (!admin) throw new Error("No admin user — run the base seed first");
  const cats = await db.select().from(appCategoriesTable);
  const catId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  for (const a of APPS) {
    const [row] = await db.insert(appsTable).values({
      slug: a.slug, name: a.name, tagline: a.tagline, categoryId: catId(a.category),
      ownerId: admin.id, isFirstParty: true, stage: "graduated", accessType: "link_out",
      externalUrl: a.url,
    }).onConflictDoUpdate({
      target: appsTable.slug, set: { name: a.name, categoryId: catId(a.category), updatedAt: new Date() },
    }).returning();

    if (a.modules?.length) {
      await db.delete(appModulesTable).where(eq(appModulesTable.appId, row!.id));
      await db.insert(appModulesTable).values(
        a.modules.map((name, i) => ({ appId: row!.id, name, sortOrder: i })),
      );
    }
  }
}
```

`tagline: "TODO"` and `url: null` are **intentional placeholders** pending Daniel's list. Task 12 hides the CTA when `externalUrl` is null, so a half-filled catalog degrades quietly instead of shipping dead links.

- [ ] **Step 2: Add the missing `seed` script** (fixes README:46)

`artifacts/api-server/package.json`:
```json
"seed": "node --experimental-strip-types ./src/seed.ts",
"seed:apps": "node --experimental-strip-types ./src/seed/apps.ts"
```

- [ ] **Step 3: Prove idempotency**

```bash
DATABASE_URL="$DATABASE_URL_TEST" pnpm --filter @workspace/api-server run seed:apps
DATABASE_URL="$DATABASE_URL_TEST" pnpm --filter @workspace/api-server run seed:apps
psql "$DATABASE_URL_TEST" -tAc "select count(*) from apps;"
```
Expected: `11` after both runs — not 22.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/seed artifacts/api-server/package.json
git commit -m "feat(api): idempotent first-party app seed"
```

---

### Task 11: Browse page (the Explore surface)

**Files:**
- Create: `artifacts/portal/src/pages/apps.tsx`, `artifacts/portal/src/components/apps/app-card.tsx`, `artifacts/portal/src/components/apps/category-rail.tsx`

- [ ] **Step 1: Write `app-card.tsx`**

shadcn `Card`. Icon (fallback to a lucide `Package` when `iconUrl` is null), name, tagline, category badge. Wrap in a wouter `<Link href={`/apps/${slug}`}>`.

- [ ] **Step 2: Write `category-rail.tsx`**

```tsx
import { useListAppCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export function CategoryRail({ active, onSelect }: { active?: string; onSelect: (slug?: string) => void }) {
  const { data: categories } = useListAppCategories();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <Button variant={!active ? "default" : "outline"} size="sm" onClick={() => onSelect(undefined)}>All</Button>
      {categories?.map((c) => (
        <Button key={c.slug} variant={active === c.slug ? "default" : "outline"} size="sm" onClick={() => onSelect(c.slug)}>
          {c.name}
        </Button>
      ))}
    </div>
  );
}
```

Categories come from the API — **never hardcode the list**. Adding "Finance" later must be an INSERT, not a deploy.

- [ ] **Step 3: Write `apps.tsx`**

`useState` for the active category, `useListApps({ category })` from `@workspace/api-client-react`, `<CategoryRail>` above a responsive grid of `<AppCard>`. Empty state: "No apps in this category yet." Loading: skeleton cards.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @workspace/portal run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add artifacts/portal/src/pages/apps.tsx artifacts/portal/src/components/apps/
git commit -m "feat(portal): app catalog browse page"
```

---

### Task 12: Detail page

**Files:**
- Create: `artifacts/portal/src/pages/app-detail.tsx`, `artifacts/portal/src/components/apps/module-list.tsx`

- [ ] **Step 1: Write `module-list.tsx`**

```tsx
import type { AppModule } from "@workspace/api-client-react";

export function ModuleList({ modules }: { modules: AppModule[] }) {
  if (!modules.length) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Includes</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m.id} className="rounded-lg border p-3">
            <div className="font-medium">{m.name}</div>
            {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`if (!modules.length) return null` is the point: single-module apps must look intentional, not broken.

- [ ] **Step 2: Write `app-detail.tsx`**

`useParams()` from wouter for `:slug`, `useGetApp(slug)`. Render icon, name, tagline, description, `<ModuleList>`, screenshots, category badge. CTA:

```tsx
{app.externalUrl && (
  <Button asChild size="lg">
    <a href={app.externalUrl} target="_blank" rel="noopener noreferrer">Open {app.name}</a>
  </Button>
)}
```

Guarding on `externalUrl` is what makes the TODO seed data safe to ship. 404 → `<NotFound />`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @workspace/portal run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add artifacts/portal/src/pages/app-detail.tsx artifacts/portal/src/components/apps/module-list.tsx
git commit -m "feat(portal): app detail page"
```

---

### Task 13: Routing + nav

**Files:**
- Modify: `artifacts/portal/src/App.tsx`, `artifacts/portal/src/components/layout.tsx`

- [ ] **Step 1: Add routes to `App.tsx`**

Import alongside the existing page imports:
```tsx
import AppsPage from "@/pages/apps";
import AppDetailPage from "@/pages/app-detail";
```
Add inside `<Switch>`, **before** any catch-all, matching the existing `AuthGuard` + `AppLayout` pattern:
```tsx
<Route path="/apps">
  <AuthGuard><AppLayout><AppsPage /></AppLayout></AuthGuard>
</Route>
<Route path="/apps/:slug">
  <AuthGuard><AppLayout><AppDetailPage /></AppLayout></AuthGuard>
</Route>
```
Order matters in wouter's `<Switch>`: `/apps` must precede `/apps/:slug`.

- [ ] **Step 2: Add the nav entry**

Add an "Apps" item to the sidebar in `components/layout.tsx`, using the lucide `LayoutGrid` icon, following the existing nav item shape.

- [ ] **Step 3: Typecheck + build**

Run: `pnpm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add artifacts/portal/src/App.tsx artifacts/portal/src/components/layout.tsx
git commit -m "feat(portal): wire /apps routes and nav"
```

---

### Task 14: Deploy + browser verification

**Do not claim this works until a real browser has rendered it.** HTTP 200 and PM2 "online" are not verification.

- [ ] **Step 1: Collapse the duplicate ecosystem configs — BEFORE deploying**

Prime has two untracked `ecosystem.config.cjs` files (repo root and `artifacts/api-server/`). Both define a `skool-portal` PM2 app. PM2 currently runs `/home/ubuntu/skool-portal/artifacts/api-server/dist/index.mjs`. This is the amzsites divergence shape — two configs, no enforcement. Keep exactly one, delete the other, **commit it to git**.

- [ ] **Step 2: Push and deploy**

```bash
git push origin main
ssh amg-cc-prime 'cd /home/ubuntu/skool-portal && git checkout -- pnpm-lock.yaml && git pull --rebase && \
  pnpm install --no-frozen-lockfile && \
  pnpm --filter @workspace/db run migrate && \
  pnpm -F @workspace/portal build && \
  pnpm -F @workspace/api-server build && \
  pnpm --filter @workspace/api-server run seed:apps && \
  pm2 reload skool-portal --update-env'
```
`migrate`, never `push`. The `git checkout -- pnpm-lock.yaml` is required — prime accumulates lockfile drift from `--no-frozen-lockfile` installs.

- [ ] **Step 3: Verify in a real browser**

```
preview_start { url: "https://baingers.com/apps" }
computer { action: "screenshot" }
```
Confirm by looking at the screenshot: category rail renders, all 11 apps appear, no console errors (`read_console_messages`).

- [ ] **Step 4: Verify the detail page**

Navigate to `https://baingers.com/apps/omnisend`. Confirm visually: name, three modules in order (Push, Email, Android SMS), and **no CTA button** (the seed has no URL yet — its absence is correct).

- [ ] **Step 5: Prove R2 survives a redeploy**

Upload an icon, `pm2 reload skool-portal`, reload the page, confirm the icon still renders. This is the whole reason R2 exists — verify it, don't assume it.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A && git commit -m "fix(catalog): browser verification fixes"
```

---

## Definition of done

- [ ] `pnpm test` green
- [ ] `pnpm run build` green
- [ ] `/apps` and `/apps/omnisend` visually confirmed in a browser on the real domain
- [ ] Icon survives a `pm2 reload`
- [ ] `drizzle.__drizzle_migrations` shows baseline + catalog migration on prod
- [ ] One `ecosystem.config.cjs`, committed to git
- [ ] Seed re-runnable without duplicating rows

## Open — needs Daniel

Category, canonical URL, and one-line tagline for each of the 11 seeded apps. Ships with `TODO` taglines and null URLs; the detail page hides the CTA until a URL exists. Fill in via `PATCH /admin/apps/:id` or by editing `seed/apps.ts` and re-running.
