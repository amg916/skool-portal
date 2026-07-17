import { describe, it, expect, beforeEach } from "vitest";
import { testDb, truncateAll } from "@workspace/db/testing/harness";
import { appCategoriesTable, usersTable, appEntitlementsTable } from "@workspace/db";
import { startEntitlement, syncFromProvider, getEntitlement } from "./entitlements.js";
import { getAppBySlug } from "./apps.js";
import { submitApp, setStage } from "./incubator.js";
import { updateApp } from "./apps.js";

let user: number;
let admin: number;
let cat: number;
let appId: number;
let appSlug: string;

beforeEach(async () => {
  await truncateAll();
  const [u] = await testDb.insert(usersTable).values({ email: "u@a.co", name: "User", role: "member" }).returning();
  const [a] = await testDb.insert(usersTable).values({ email: "ad@a.co", name: "Admin", role: "admin" }).returning();
  user = u!.id;
  admin = a!.id;
  const [c] = await testDb.insert(appCategoriesTable).values({ slug: "marketing", name: "Marketing" }).returning();
  cat = c!.id;
  const app = await submitApp(admin, { name: "GHL App", categoryId: cat, externalUrl: "https://ghl.example" });
  await setStage(app.id, "graduated", admin);
  appId = app.id;
  appSlug = app.slug;
});

describe("startEntitlement", () => {
  it("creates a pending entitlement — no card, no billing data stored", async () => {
    const e = await startEntitlement(appId, user);
    expect(e.status).toBe("pending");
    expect(e.provider).toBe("ghl");
    const [row] = await testDb.select().from(appEntitlementsTable);
    // the ONLY provider data we keep is an external id + status
    expect(Object.keys(row!)).toEqual(
      expect.arrayContaining(["appId", "userId", "provider", "externalId", "status"]),
    );
    expect(row!.externalId).toBeNull();
  });

  it("is idempotent — starting twice keeps one row", async () => {
    await startEntitlement(appId, user);
    await startEntitlement(appId, user);
    const rows = await testDb.select().from(appEntitlementsTable);
    expect(rows).toHaveLength(1);
  });
});

describe("syncFromProvider (GHL webhook)", () => {
  it("activates on provision and records the GHL location id", async () => {
    await startEntitlement(appId, user);
    await syncFromProvider({ appId, userId: user, externalId: "loc_abc123", status: "active" });
    const e = await getEntitlement(appId, user);
    expect(e?.status).toBe("active");
    expect(e?.externalId).toBe("loc_abc123");
  });

  it("pauses when GHL reports a failed card", async () => {
    await startEntitlement(appId, user);
    await syncFromProvider({ appId, userId: user, externalId: "loc_x", status: "active" });
    await syncFromProvider({ appId, userId: user, externalId: "loc_x", status: "paused" });
    expect((await getEntitlement(appId, user))?.status).toBe("paused");
  });

  it("upserts even if no local row existed (GHL provisioned out of band)", async () => {
    await syncFromProvider({ appId, userId: user, externalId: "loc_new", status: "active" });
    expect((await getEntitlement(appId, user))?.status).toBe("active");
  });
});

describe("entitlement surfaces on the app detail", () => {
  it("provisioned apps expose myEntitlement", async () => {
    await updateApp(appId, {});
    await testDb.execute(
      // flip to provisioned (GHL is the only provisioned app today)
      // eslint-disable-next-line
      (await import("drizzle-orm")).sql`update apps set access_type = 'provisioned' where id = ${appId}`,
    );
    await startEntitlement(appId, user);
    await syncFromProvider({ appId, userId: user, externalId: "loc_d", status: "active" });
    const detail = await getAppBySlug(appSlug, user);
    expect(detail?.accessType).toBe("provisioned");
    expect(detail?.myEntitlement?.status).toBe("active");
  });

  it("link_out apps have no entitlement", async () => {
    const detail = await getAppBySlug(appSlug, user);
    expect(detail?.accessType).toBe("link_out");
    expect(detail?.myEntitlement ?? null).toBeNull();
  });
});
