import { db, usersTable, channelsTable, segmentsTable, subsectionsTable, lessonsTable } from "@workspace/db";
import { hashPassword } from "./lib/auth.js";
import { logger } from "./lib/logger.js";

export async function seed() {
  // Check if already seeded
  const existingUsers = await db.select().from(usersTable).limit(1);
  if (existingUsers.length > 0) {
    logger.info("Database already seeded, skipping.");
    return;
  }

  logger.info("Seeding database...");

  // Create admin user
  const adminHash = await hashPassword("admin123!");
  await db.insert(usersTable).values({
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    passwordHash: adminHash,
    isActive: true,
    forcePasswordChange: false,
  });

  // Create default Announcements channel
  await db.insert(channelsTable).values([
    { name: "Announcements", description: "Important announcements from the team", adminsOnly: true, isDefault: true, sortOrder: 0 },
    { name: "General", description: "General discussion for everyone", adminsOnly: false, isDefault: false, sortOrder: 1 },
    { name: "Introductions", description: "Introduce yourself to the community", adminsOnly: false, isDefault: false, sortOrder: 2 },
  ]);

  // Create sample school content
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
      title: "Welcome to the Program",
      type: "text",
      content: "Welcome! We're so excited to have you here. This program is designed to help you succeed. Take your time with each lesson and reach out in the community if you have any questions.",
      sortOrder: 0,
    },
    {
      subsectionId: subsection.id,
      title: "Program Overview Video",
      type: "loom",
      content: "https://www.loom.com/share/example",
      sortOrder: 1,
    },
  ]);

  logger.info("Database seeded successfully. Admin login: admin@example.com / admin123!");
}
