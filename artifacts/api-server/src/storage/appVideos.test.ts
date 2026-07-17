import { describe, it, expect, beforeEach } from "vitest";
import { testDb, truncateAll } from "@workspace/db/testing/harness";
import { appCategoriesTable, usersTable, recordingsTable } from "@workspace/db";
import { attachVideo, detachVideo, listAppVideos } from "./appVideos.js";
import { getAppBySlug } from "./apps.js";
import { submitApp, setStage } from "./incubator.js";

let admin: number;
let cat: number;
let appId: number;
let appSlug: string;

async function makeRecording(uid: string, status: "ready" | "pending" = "ready") {
  const [r] = await testDb
    .insert(recordingsTable)
    .values({
      userId: admin,
      streamUid: uid,
      status,
      embedUrl: `https://customer-x.cloudflarestream.com/${uid}/iframe`,
      thumbnailUrl: `https://thumb/${uid}.jpg`,
      durationSec: 300,
      transcript: "hello from the walkthrough",
    })
    .returning();
  return r!.id;
}

beforeEach(async () => {
  await truncateAll();
  const [a] = await testDb.insert(usersTable).values({ email: "ad@a.co", name: "Admin", role: "admin" }).returning();
  admin = a!.id;
  const [c] = await testDb.insert(appCategoriesTable).values({ slug: "marketing", name: "Marketing" }).returning();
  cat = c!.id;
  const app = await submitApp(admin, { name: "Vid App", categoryId: cat, externalUrl: "https://v.example" });
  await setStage(app.id, "graduated", admin);
  appId = app.id;
  appSlug = app.slug;
});

describe("attachVideo", () => {
  it("attaches a recording and exposes its CF Stream fields", async () => {
    const rec = await makeRecording("uid-1");
    await attachVideo(appId, { recordingId: rec, role: "walkthrough", title: "How it works" }, admin);
    const vids = await listAppVideos(appId);
    expect(vids).toHaveLength(1);
    expect(vids[0]!.streamUid).toBe("uid-1");
    expect(vids[0]!.embedUrl).toContain("uid-1");
    expect(vids[0]!.transcript).toContain("walkthrough");
    expect(vids[0]!.role).toBe("walkthrough");
  });

  it("is idempotent — attaching the same recording twice keeps one row", async () => {
    const rec = await makeRecording("uid-dup");
    await attachVideo(appId, { recordingId: rec }, admin);
    await attachVideo(appId, { recordingId: rec }, admin);
    expect(await listAppVideos(appId)).toHaveLength(1);
  });

  it("orders by sortOrder", async () => {
    const r1 = await makeRecording("uid-a");
    const r2 = await makeRecording("uid-b");
    await attachVideo(appId, { recordingId: r1, sortOrder: 2 }, admin);
    await attachVideo(appId, { recordingId: r2, sortOrder: 1 }, admin);
    const vids = await listAppVideos(appId);
    expect(vids.map((v) => v.streamUid)).toEqual(["uid-b", "uid-a"]);
  });
});

describe("detachVideo", () => {
  it("removes the join but keeps the recording", async () => {
    const rec = await makeRecording("uid-keep");
    await attachVideo(appId, { recordingId: rec }, admin);
    const [v] = await listAppVideos(appId);
    await detachVideo(appId, v!.id);
    expect(await listAppVideos(appId)).toHaveLength(0);
    const recs = await testDb.select().from(recordingsTable);
    expect(recs).toHaveLength(1); // recording survives — it's shared, not owned
  });
});

describe("videos surface on the app detail", () => {
  it("getAppBySlug returns attached videos", async () => {
    const rec = await makeRecording("uid-detail");
    await attachVideo(appId, { recordingId: rec, title: "Demo" }, admin);
    const detail = await getAppBySlug(appSlug, admin);
    expect(detail?.videos).toHaveLength(1);
    expect(detail?.videos?.[0]!.title).toBe("Demo");
  });
});
