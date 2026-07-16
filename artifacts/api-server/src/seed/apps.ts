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
  {
    slug: "command-center",
    name: "Campus Command Center",
    category: "admin",
    tagline: "Automation to-do board that hands builds to the dev team",
    url: "https://campus.amgcc.space",
  },
  { slug: "employee-tracker", name: "Employee Tracker", category: "admin", tagline: null, url: null },
  {
    slug: "trackdrive",
    name: "TrackDrive",
    category: "tracking",
    tagline: "In-house call tracking and routing",
    url: "https://calls.amgcc.space",
  },
  // Overflow clone: no PM2 process, no directory on prime, no DNS hostname.
  // It does not exist yet — left unlinked rather than pointed at nothing.
  { slug: "overflow", name: "Overflow", category: "logistics", tagline: null, url: null },
  {
    slug: "kingdom",
    name: "Kingdom",
    category: "marketing",
    tagline: "Ecommerce empire dashboard",
    url: "https://kingdom.amgcc.space",
    modules: ["Funnel Jacker"],
  },
  // content-studio-v2 is running on prime (:3110) but has NO tunnel route or
  // DNS hostname — it is not publicly reachable, so it gets no link.
  { slug: "content-studio", name: "Content Studio", category: "marketing", tagline: null, url: null },
  { slug: "freegaime", name: "Freegaime", category: "marketing", tagline: null, url: null },
  { slug: "patent-searcher", name: "Patent Searcher", category: "admin", tagline: null, url: null },
  { slug: "quickbooks", name: "QuickBooks", category: "admin", tagline: null, url: null },
  {
    slug: "unibox",
    name: "Unibox",
    category: "marketing",
    tagline: "One inbox across every email account, sorted your way",
    url: "https://inbox.amgcc.space",
  },
  {
    slug: "push-platform",
    name: "Push Platform",
    category: "marketing",
    tagline: "Web push notification campaigns and subscriber management",
    url: "https://push.amgcc.space",
  },
  {
    slug: "textbee",
    name: "TextBee",
    category: "marketing",
    tagline: "Android phone as an SMS gateway, with webhooks",
    url: "https://textbee.amgcc.space",
    modules: ["Dashboard", "REST API"],
  },
  {
    slug: "leadprosper",
    name: "Lead Prosper",
    category: "tracking",
    tagline: "In-house lead distribution and buyer routing",
    url: "https://leadprosper.amgcc.space",
  },
  {
    slug: "master-crm",
    name: "Master CRM",
    category: "admin",
    tagline: "Cross-brand customer records and order history",
    url: "https://crm.amgcc.space",
  },

  // Live AMG apps found across the devteam board, CLAUDE.md and prime. Every URL
  // below returned 200 when seeded. Deliberately excluded: one-off ops errands
  // that happen to have a URL ("cancel my mids", "reapply for Utah licensing"),
  // and anything not currently up — malibu-sms.amgcc.space (502) and
  // affiliate-brain.amgcc.space (does not resolve).
  {
    slug: "truinvoice",
    name: "TruInvoice",
    category: "admin",
    tagline: "Generate branded invoices and payment links on demand",
    url: "https://truinvoice.amgcc.space",
  },
  {
    slug: "warmly",
    name: "Warmly",
    category: "marketing",
    tagline: "Inbox warming and deliverability monitoring",
    url: "https://warmly.amgcc.space",
  },
  {
    slug: "sic",
    name: "SIC",
    category: "tracking",
    tagline: "Daily SEC filing ingest and toxic-stock screening",
    url: "https://sic.amgcc.space",
  },
  {
    slug: "tg-ops",
    name: "TG Ops",
    category: "admin",
    tagline: "See, pause and edit every Telegram automation in one place",
    url: "https://tg-ops.amgcc.space",
  },
  {
    slug: "b2b",
    name: "B2B Email",
    category: "marketing",
    tagline: "B2B outreach sending and list management",
    url: "https://b2b.amgcc.space",
  },
  {
    slug: "cashpro-returns",
    name: "CashPro Returns",
    category: "admin",
    tagline: "Pull Bank of America return transactions into ACH Pro",
    url: "https://cashpro-returns.amgcc.space",
  },
  {
    slug: "leadforms",
    name: "Leadforms",
    category: "marketing",
    tagline: "Run Facebook lead forms against affiliate offers",
    url: "https://leadforms.amgcc.space",
  },
  {
    slug: "mcopulse",
    name: "MCO Pulse",
    category: "marketing",
    tagline: "Daily email blast scheduling and delivery checks",
    url: "https://mcopulse.amgcc.space",
  },
  {
    slug: "olivia",
    name: "Olivia",
    category: "marketing",
    tagline: "Unified Messenger and Instagram inbox for campaigns",
    url: "https://olivia.amgcc.space",
  },
  {
    slug: "ach-pro",
    name: "ACH Pro",
    category: "admin",
    tagline: "Bank of America CashPro ACH refund manager",
    url: "https://ach-pro.amgcc.space",
  },
  {
    slug: "amazon-command-center",
    name: "Amazon Command Center",
    category: "tracking",
    tagline: "Seller, ads and inventory dashboards across every brand",
    url: "https://amazon.amgcc.space",
  },
  {
    slug: "ecom-hub",
    name: "Ecom Hub",
    category: "admin",
    tagline: "Cross-store ecommerce overview",
    url: "https://ecom.amgcc.space",
  },
  {
    slug: "funnel-forge",
    name: "Funnel Forge",
    category: "marketing",
    tagline: "Mix-and-match funnel pages with live checkout",
    url: "https://forge.amgcc.space",
  },
  {
    slug: "amg-campus",
    name: "AMG Campus",
    category: "admin",
    tagline: "Automation to-do board that hands builds to the dev team",
    url: "https://devteam.amgcc.space",
  },
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
