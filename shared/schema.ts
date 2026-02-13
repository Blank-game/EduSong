import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const songs = pgTable("songs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  lyrics: text("lyrics").notNull(),
  rhythmPattern: text("rhythm_pattern"),
  culturalNotes: text("cultural_notes"),
  musicalStyle: text("musical_style"),
  sourceDocumentId: varchar("source_document_id", { length: 36 }),
  sourceText: text("source_text"),
  audioUrl: text("audio_url"),
  sunoJobId: varchar("suno_job_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;

export const generateSongRequestSchema = z.object({
  content: z.string().min(10, "Content must be at least 10 characters"),
  documentId: z.string().optional(),
  musicalStyle: z.enum(["traditional", "highlife", "afrobeat", "palm-wine"]).default("traditional"),
  complexity: z.enum(["simple", "moderate", "advanced"]).default("simple"),
});

export type GenerateSongRequest = z.infer<typeof generateSongRequestSchema>;
