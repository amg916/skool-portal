import { describe, it, expect, beforeEach } from "vitest";
import { testDb, truncateAll } from "@workspace/db/testing/harness";
import { appCategoriesTable, appsTable, usersTable } from "@workspace/db";
import { submitApp, voteApp, unvoteApp, setStage } from "./incubator.js";
import { listApps } from "./apps.js";

let memberId: number;
let adminId: number;
let otherId: number;
let marketingId: number;

beforeEach(async () => {
  await truncateAll();
  const [m] = await testDb.insert(usersTable).values({ email: "m@a.co", name: "Member", role: "member" }).returning();
  const [a] = await testDb.insert(usersTable).values({ email: "ad@a.co", name: "Admin", role: "admin" }).returning();
  const [o] = await testDb.insert(usersTable).values({ email: "o@a.co", name: "Other", role: "member" }).returning();
  memberId = m!.id;
  adminId = a!.id;
  otherId = o!.id;
  const [c] = await testDb.insert(appCategoriesTable).values({ slug: "marketing", name: "Marketing" }).returning();
  marketingId = c!.id;
});

describe("submitApp", () => {
  it("forces stage=submitted, is_first_party=false, owner=submitter", async () => {
    const app = await submitApp(memberId, {
      name: "My Tool",
      slug: "my-tool",
      categoryId: marketingId,
      externalUrl: "https://mytool.example",
    });
    expect(app.stage).toBe("submitted");
    const [row] = await testDb.select().from(appsTable);
    expect(row!.isFirstParty).toBe(false);
    expect(row!.ownerId).toBe(memberId);
    expect(row!.stage).toBe("submitted");
  });

  it("derives a slug from the name when none is given", async () => {
    const app = await submitApp(memberId, {
      name: "Cool App 2000!",
      categoryId: marketingId,
      externalUrl: "https://x.example",
    });
    expect(app.slug).toBe("cool-app-2000");
  });
});

describe("voteApp / unvoteApp", () => {
  it("is idempotent — voting twice yields one vote", async () => {
    const app = await submitApp(memberId, { name: "A", categoryId: marketingId, externalUrl: "https://a.co" });
    await setStage(app.id, "incubating", adminId);
    const r1 = await voteApp(app.id, otherId);
    const r2 = await voteApp(app.id, otherId);
    expect(r1.voteCount).toBe(1);
    expect(r2.voteCount).toBe(1);
    expect(r2.votedByMe).toBe(true);
  });

  it("unvote removes the vote", async () => {
    const app = await submitApp(memberId, { name: "A", categoryId: marketingId, externalUrl: "https://a.co" });
    await setStage(app.id, "incubating", adminId);
    await voteApp(app.id, otherId);
    const r = await unvoteApp(app.id, otherId);
    expect(r.voteCount).toBe(0);
    expect(r.votedByMe).toBe(false);
  });

  it("refuses to vote a graduated app", async () => {
    const app = await submitApp(memberId, { name: "A", categoryId: marketingId, externalUrl: "https://a.co" });
    await setStage(app.id, "graduated", adminId);
    await expect(voteApp(app.id, otherId)).rejects.toThrow(/not votable/i);
  });
});

describe("listApps with votes (Incubator surface)", () => {
  it("returns incubating apps vote-ranked with votedByMe", async () => {
    const low = await submitApp(memberId, { name: "Low", categoryId: marketingId, externalUrl: "https://l.co" });
    const high = await submitApp(memberId, { name: "High", categoryId: marketingId, externalUrl: "https://h.co" });
    await setStage(low.id, "incubating", adminId);
    await setStage(high.id, "incubating", adminId);
    await voteApp(high.id, otherId);
    await voteApp(high.id, adminId);
    await voteApp(low.id, otherId);

    const rows = await listApps({ stage: "incubating", viewerId: otherId });
    expect(rows.map((r) => r.slug)).toEqual(["high", "low"]); // ranked by votes desc
    expect(rows[0]!.voteCount).toBe(2);
    expect(rows[0]!.votedByMe).toBe(true);
    expect(rows[1]!.voteCount).toBe(1);
  });

  it("does not surface submitted (unreviewed) apps on the incubating query", async () => {
    await submitApp(memberId, { name: "Pending", categoryId: marketingId, externalUrl: "https://p.co" });
    const rows = await listApps({ stage: "incubating" });
    expect(rows).toEqual([]);
  });
});

describe("setStage", () => {
  it("stamps graduated_at and graduated_by on graduation", async () => {
    const app = await submitApp(memberId, { name: "A", categoryId: marketingId, externalUrl: "https://a.co" });
    await setStage(app.id, "graduated", adminId);
    const [row] = await testDb.select().from(appsTable);
    expect(row!.stage).toBe("graduated");
    expect(row!.graduatedAt).not.toBeNull();
    expect(row!.graduatedBy).toBe(adminId);
  });
});
