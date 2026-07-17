import { describe, it, expect, beforeEach } from "vitest";
import { testDb, truncateAll } from "@workspace/db/testing/harness";
import { appCategoriesTable, appsTable, usersTable } from "@workspace/db";
import { rateApp, unrateApp, listReviews } from "./ratings.js";
import { getAppBySlug, listApps } from "./apps.js";
import { submitApp, setStage } from "./incubator.js";

let u1: number;
let u2: number;
let admin: number;
let cat: number;

async function makeGraduatedApp(name: string) {
  const app = await submitApp(u1, { name, categoryId: cat, externalUrl: "https://x.example" });
  await setStage(app.id, "graduated", admin);
  return app;
}

beforeEach(async () => {
  await truncateAll();
  const [a] = await testDb.insert(usersTable).values({ email: "a@a.co", name: "Ann", role: "member" }).returning();
  const [b] = await testDb.insert(usersTable).values({ email: "b@a.co", name: "Bob", role: "member" }).returning();
  const [c] = await testDb.insert(usersTable).values({ email: "ad@a.co", name: "Admin", role: "admin" }).returning();
  u1 = a!.id;
  u2 = b!.id;
  admin = c!.id;
  const [cc] = await testDb.insert(appCategoriesTable).values({ slug: "marketing", name: "Marketing" }).returning();
  cat = cc!.id;
});

describe("rateApp", () => {
  it("records a rating and aggregates it", async () => {
    const app = await makeGraduatedApp("Rated");
    const r = await rateApp(app.id, u1, { rating: 4 });
    expect(r.ratingCount).toBe(1);
    expect(r.avgRating).toBe(4);
    expect(r.myRating).toBe(4);
  });

  it("upserts — a second rating from the same user replaces, not duplicates", async () => {
    const app = await makeGraduatedApp("Rated");
    await rateApp(app.id, u1, { rating: 2 });
    const r = await rateApp(app.id, u1, { rating: 5, review: "changed my mind" });
    expect(r.ratingCount).toBe(1);
    expect(r.avgRating).toBe(5);
  });

  it("averages across users", async () => {
    const app = await makeGraduatedApp("Rated");
    await rateApp(app.id, u1, { rating: 5 });
    const r = await rateApp(app.id, u2, { rating: 3 });
    expect(r.ratingCount).toBe(2);
    expect(r.avgRating).toBe(4);
  });

  it("refuses to rate a non-graduated app (incubator apps are voted, not rated)", async () => {
    const app = await submitApp(u1, { name: "Pending", categoryId: cat, externalUrl: "https://p.co" });
    await setStage(app.id, "incubating", admin);
    await expect(rateApp(app.id, u2, { rating: 5 })).rejects.toThrow(/not rateable/i);
  });

  it("rejects an out-of-range rating", async () => {
    const app = await makeGraduatedApp("Rated");
    await expect(rateApp(app.id, u1, { rating: 9 })).rejects.toThrow();
  });
});

describe("unrateApp", () => {
  it("removes the rating and re-aggregates", async () => {
    const app = await makeGraduatedApp("Rated");
    await rateApp(app.id, u1, { rating: 4 });
    const r = await unrateApp(app.id, u1);
    expect(r.ratingCount).toBe(0);
    expect(r.avgRating).toBeNull();
    expect(r.myRating).toBeNull();
  });
});

describe("listReviews", () => {
  it("returns only ratings that carry review text, newest first, with the author", async () => {
    const app = await makeGraduatedApp("Rated");
    await rateApp(app.id, u1, { rating: 5, review: "great" });
    await rateApp(app.id, u2, { rating: 3 }); // no text — not a review
    const reviews = await listReviews(app.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.review).toBe("great");
    expect(reviews[0]!.userName).toBe("Ann");
  });
});

describe("rating aggregates surface on reads", () => {
  it("getAppBySlug returns avgRating/ratingCount/myRating", async () => {
    const app = await makeGraduatedApp("Rated");
    await rateApp(app.id, u1, { rating: 4 });
    const detail = await getAppBySlug(app.slug, u1);
    expect(detail?.avgRating).toBe(4);
    expect(detail?.ratingCount).toBe(1);
    expect(detail?.myRating).toBe(4);
    expect(detail?.reviews).toBeDefined();
  });

  it("listApps (catalog) carries the rating aggregate", async () => {
    const app = await makeGraduatedApp("Rated");
    await rateApp(app.id, u1, { rating: 5 });
    const [row] = await listApps({ viewerId: u1 });
    expect(row!.avgRating).toBe(5);
    expect(row!.ratingCount).toBe(1);
  });
});
