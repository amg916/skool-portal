import { describe, it, expect, beforeEach } from "vitest";
import { testDb, truncateAll } from "@workspace/db/testing/harness";
import { appCategoriesTable, appsTable, appModulesTable, usersTable } from "@workspace/db";
import { listApps, getAppBySlug, retireApp } from "./apps.js";

let ownerId: number;
let marketingId: number;

beforeEach(async () => {
  await truncateAll();
  const [u] = await testDb
    .insert(usersTable)
    .values({ email: "owner@amg.co", name: "Owner", role: "admin" })
    .returning();
  ownerId = u!.id;
  const [c] = await testDb
    .insert(appCategoriesTable)
    .values({ slug: "marketing", name: "Marketing", sortOrder: 0 })
    .returning();
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
    const [admin] = await testDb
      .insert(appCategoriesTable)
      .values({ slug: "admin", name: "Admin", sortOrder: 1 })
      .returning();
    await testDb.insert(appsTable).values([
      { slug: "mk", name: "Mk", categoryId: marketingId, ownerId, stage: "graduated" },
      { slug: "ad", name: "Ad", categoryId: admin!.id, ownerId, stage: "graduated" },
    ]);
    const rows = await listApps({ category: "admin" });
    expect(rows.map((r) => r.slug)).toEqual(["ad"]);
  });

  it("can opt in to a non-graduated stage", async () => {
    await testDb.insert(appsTable).values([
      { slug: "live", name: "Live", categoryId: marketingId, ownerId, stage: "graduated" },
      { slug: "inc", name: "Inc", categoryId: marketingId, ownerId, stage: "incubating" },
    ]);
    const rows = await listApps({ stage: "incubating" });
    expect(rows.map((r) => r.slug)).toEqual(["inc"]);
  });

  it("exposes the joined category slug", async () => {
    await testDb
      .insert(appsTable)
      .values({ slug: "mk", name: "Mk", categoryId: marketingId, ownerId, stage: "graduated" });
    const [row] = await listApps({});
    expect(row!.categorySlug).toBe("marketing");
  });
});

describe("getAppBySlug", () => {
  it("returns modules ordered by sortOrder", async () => {
    const [app] = await testDb
      .insert(appsTable)
      .values({
        slug: "omnisend",
        name: "Omnisend",
        categoryId: marketingId,
        ownerId,
        stage: "graduated",
      })
      .returning();
    await testDb.insert(appModulesTable).values([
      { appId: app!.id, name: "Android SMS", sortOrder: 2 },
      { appId: app!.id, name: "Push", sortOrder: 0 },
      { appId: app!.id, name: "Email", sortOrder: 1 },
    ]);
    const found = await getAppBySlug("omnisend");
    expect(found?.modules.map((m) => m.name)).toEqual(["Push", "Email", "Android SMS"]);
  });

  it("returns an empty module list for an app with no modules", async () => {
    await testDb
      .insert(appsTable)
      .values({ slug: "solo", name: "Solo", categoryId: marketingId, ownerId, stage: "graduated" });
    const found = await getAppBySlug("solo");
    expect(found?.modules).toEqual([]);
  });

  it("returns null for an unknown slug", async () => {
    expect(await getAppBySlug("nope")).toBeNull();
  });
});

describe("retireApp", () => {
  it("sets stage to retired without deleting the row", async () => {
    const [app] = await testDb
      .insert(appsTable)
      .values({ slug: "old", name: "Old", categoryId: marketingId, ownerId, stage: "graduated" })
      .returning();
    await retireApp(app!.id);
    const rows = await testDb.select().from(appsTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.stage).toBe("retired");
  });

  it("removes a retired app from the default listing", async () => {
    const [app] = await testDb
      .insert(appsTable)
      .values({ slug: "old", name: "Old", categoryId: marketingId, ownerId, stage: "graduated" })
      .returning();
    await retireApp(app!.id);
    expect(await listApps({})).toEqual([]);
  });
});
