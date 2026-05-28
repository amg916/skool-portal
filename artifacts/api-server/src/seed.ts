import { db, usersTable, channelsTable, segmentsTable, subsectionsTable, lessonsTable, postsTable, groupSettingsTable } from "@workspace/db";
import { hashPassword } from "./lib/auth.js";
import { logger } from "./lib/logger.js";

const WELCOME_BODY = `Welcome to Baingers 🔥

If you're here, you're already done with the 90-minute lecture circuit. Baingers exists because watching ≠ doing — every video here ends with a quick build idea you can try the same day.

The loop:
1. Watch the banger (under 10 min, every time)
2. Try it
3. Post what you made — the community gives feedback

Hit play on the video, then drop a quick hello in #introductions.`;

const WELCOME_LOOM_URL = "https://www.loom.com/share/4cee42f318cf4938ba2187690890f436";

export async function seed() {
  const existingUsers = await db.select().from(usersTable).limit(1);
  if (existingUsers.length > 0) {
    logger.info("Database already seeded, skipping.");
    return;
  }

  logger.info("Seeding database...");

  const adminHash = await hashPassword("admin123!");
  const [admin] = await db
    .insert(usersTable)
    .values({
      email: "admin@example.com",
      name: "Baingers",
      role: "admin",
      passwordHash: adminHash,
      isActive: true,
      forcePasswordChange: false,
    })
    .returning();

  await db.insert(groupSettingsTable).values({
    name: "Baingers",
    slug: "baingers.com",
    description:
      "AI banger videos. Under 10 minutes. Watch one, ship something the same day. Members-only community for builders who actually try the stuff.",
    bannerUrl: "/uploads/baingers-logo.png",
    iconUrl: "/uploads/baingers-logo.png",
  });

  const channels = await db
    .insert(channelsTable)
    .values([
      { name: "General", description: "Bangers, builds, hot takes — drop them here.", adminsOnly: false, isDefault: true, sortOrder: 0 },
      { name: "Introductions", description: "New here? Tell us who you are and what you make.", adminsOnly: false, isDefault: false, sortOrder: 1 },
      { name: "Announcements", description: "Team updates and pinned reading.", adminsOnly: true, isDefault: false, sortOrder: 2 },
    ])
    .returning();

  const generalChannel = channels.find((c) => c.name === "General")!;

  await db.insert(postsTable).values({
    channelId: generalChannel.id,
    authorId: admin!.id,
    body: WELCOME_BODY,
    loomUrl: WELCOME_LOOM_URL,
    isPinned: true,
  });

  const [segment] = await db.insert(segmentsTable).values({
    title: "Getting Started",
    description: "Everything you need to know to get started",
    sortOrder: 0,
  }).returning();

  const [subsection] = await db.insert(subsectionsTable).values({
    segmentId: segment.id,
    title: "Welcome & Orientation",
    description: "Introduction to the program",
    sortOrder: 0,
  }).returning();

  await db.insert(lessonsTable).values([
    {
      subsectionId: subsection.id,
      title: "Watch this first",
      type: "loom",
      content: WELCOME_LOOM_URL,
      sortOrder: 0,
    },
  ]);

  logger.info("Database seeded successfully. Admin login: admin@example.com / admin123!");
}
