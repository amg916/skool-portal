import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Recordings produced by the in-app "Record a banger" flow.
 * One row per upload to Cloudflare Stream.
 *
 * Lifecycle:
 *   pending  → tus upload URL minted, client recording in progress
 *   uploaded → tus upload finished, CF Stream still encoding
 *   ready    → CF Stream encoded; hlsUrl, mp4Url, thumbnailUrl all populated
 *   error    → CF Stream encoding failed (errorMessage populated)
 */
export const recordingsTable = pgTable(
  "recordings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    streamUid: text("stream_uid").notNull().unique(), // CF Stream video UID
    status: text("status", {
      enum: ["pending", "uploaded", "ready", "error"],
    })
      .notNull()
      .default("pending"),
    durationSec: integer("duration_sec"), // null until CF reports
    thumbnailUrl: text("thumbnail_url"), // CF Stream-hosted JPG
    hlsUrl: text("hls_url"), // .m3u8 manifest for adaptive playback
    mp4Url: text("mp4_url"), // direct MP4 download (audio extraction etc.)
    embedUrl: text("embed_url"), // iframe URL for VideoEmbed
    transcript: text("transcript"), // Whisper output, null while processing
    errorMessage: text("error_message"), // CF / Whisper failure detail
    titleHint: text("title_hint"), // auto-extracted from first transcript sentence
    tagsHint: text("tags_hint"), // comma-separated auto-tags from Claude
    createdAt: timestamp("created_at").defaultNow().notNull(),
    readyAt: timestamp("ready_at"), // when CF flipped to ready
    transcribedAt: timestamp("transcribed_at"), // when Whisper finished
  },
  (t) => ({
    userIdx: index("recordings_user_idx").on(t.userId),
    statusIdx: index("recordings_status_idx").on(t.status),
  }),
);

export const insertRecordingSchema = createInsertSchema(recordingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordingsTable.$inferSelect;
