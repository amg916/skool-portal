import { db, appCategoriesTable, appsTable, appModulesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Explore is deliberately NOT a category — it is a browse surface. A category
// named Explore swallows apps and makes them unfindable.
const CATEGORIES = [
  { slug: "marketing", name: "Marketing", icon: "Megaphone", sortOrder: 0 },
  { slug: "admin", name: "Admin", icon: "Settings", sortOrder: 1 },
  { slug: "logistics", name: "Logistics", icon: "Truck", sortOrder: 2 },
  { slug: "tracking", name: "Tracking", icon: "Activity", sortOrder: 3 },
];

type SeedApp = {
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  url: string | null;
  modules?: string[];
};

// tagline: null and url: null are intentional placeholders pending Daniel's list.
// The detail page hides the CTA when externalUrl is null, so an unfilled entry
// degrades quietly instead of shipping a dead link.
const APPS: SeedApp[] = [
  {
    slug: "omnisend",
    name: "Omnisend",
    category: "marketing",
    tagline: "Push, email and Android SMS in one place",
    url: "https://omnisend.amgcc.space",
    modules: ["Push", "Email", "Android SMS"],
  },
  { slug: "command-center", name: "Command Center", category: "admin", tagline: null, url: null },
  { slug: "employee-tracker", name: "Employee Tracker", category: "admin", tagline: null, url: null },
  {
    slug: "trackdrive",
    name: "TrackDrive",
    category: "tracking",
    tagline: "In-house call tracking and routing",
    url: "https://calls.amgcc.space",
  },
  { slug: "overflow", name: "Overflow", category: "logistics", tagline: null, url: null },
  {
    slug: "kingdom",
    name: "Kingdom",
    category: "marketing",
    tagline: null,
    url: null,
    modules: ["Funnel Jacker"],
  },
  { slug: "content-studio", name: "Content Studio", category: "marketing", tagline: null, url: null },
  { slug: "freegaime", name: "Freegaime", category: "marketing", tagline: null, url: null },
  { slug: "patent-searcher", name: "Patent Searcher", category: "admin", tagline: null, url: null },
  { slug: "quickbooks", name: "QuickBooks", category: "admin", tagline: null, url: null },
  { slug: "unibox", name: "Unibox", category: "marketing", tagline: null, url: null },
];

export async function seedApps() {
  for (const c of CATEGORIES) {
    await db
      .insert(appCategoriesTable)
      .values(c)
      .onConflictDoUpdate({
        target: appCategoriesTable.slug,
        set: { name: c.name, icon: c.icon, sortOrder: c.sortOrder },
      });
  }

  const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
  if (!admin) throw new Error("No admin user found — run the base seed first");

  const cats = await db.select().from(appCategoriesTable);
  const catId = (slug: string) => {
    const c = cats.find((x) => x.slug === slug);
    if (!c) throw new Error(`Unknown category: ${slug}`);
    return c.id;
  };

  for (const a of APPS) {
    const [row] = await db
      .insert(appsTable)
      .values({
        slug: a.slug,
        name: a.name,
        tagline: a.tagline,
        categoryId: catId(a.category),
        ownerId: admin.id,
        isFirstParty: true,
        stage: "graduated",
        accessType: "link_out",
        externalUrl: a.url,
      })
      .onConflictDoUpdate({
        target: appsTable.slug,
        set: {
          name: a.name,
          tagline: a.tagline,
          categoryId: catId(a.category),
          externalUrl: a.url,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (a.modules?.length) {
      await db.delete(appModulesTable).where(eq(appModulesTable.appId, row!.id));
      await db
        .insert(appModulesTable)
        .values(a.modules.map((name, i) => ({ appId: row!.id, name, sortOrder: i })));
    }
  }

  console.log(`Seeded ${CATEGORIES.length} categories and ${APPS.length} apps`);
}

seedApps()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
