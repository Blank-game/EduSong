import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { documents, songs, type Document, type InsertDocument, type Song, type InsertSong } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export class PostgresStorage implements IStorage {

async getDocuments(): Promise<Document[]> {
return await db
.select()
.from(documents)
.orderBy(desc(documents.uploadedAt));
}
async getDocument(id: string): Promise<Document | undefined> {
const result = await db
.select()
.from(documents)
.where(eq(documents.id, id))
.limit(1);
return result[0];
}
async createDocument(insertDocument: InsertDocument): Promise<Document> {
const id = randomUUID();
const document: Document = {
...insertDocument,
      id,
      uploadedAt: new Date(),
};
await db.insert(documents).values(document);
return document;
}
async deleteDocument(id: string): Promise<boolean> {
const result = await db
.delete(documents)
.where(eq(documents.id, id));
return result.rowCount !== null && result.rowCount > 0;
}

async getSongs(): Promise<Song[]> {
return await db
.select()
.from(songs)
.orderBy(desc(songs.createdAt));
}
async getSong(id: string): Promise<Song | undefined> {
const result = await db
.select()
.from(songs)
.where(eq(songs.id, id))
.limit(1);
return result[0];
}
async createSong(insertSong: InsertSong): Promise<Song> {
const id = randomUUID();
const song: Song = {
      id,
      title: insertSong.title,
      topic: insertSong.topic,
      lyrics: insertSong.lyrics,
      rhythmPattern: insertSong.rhythmPattern ?? null,
      culturalNotes: insertSong.culturalNotes ?? null,
      musicalStyle: insertSong.musicalStyle ?? null,
      sourceDocumentId: insertSong.sourceDocumentId ?? null,
      sourceText: insertSong.sourceText ?? null,
      audioUrl: insertSong.audioUrl ?? null,
      sunoJobId: insertSong.sunoJobId ?? null,
      createdAt: new Date(),
};
await db.insert(songs).values(song);
return song;
}

  async updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined> {
    const result = await db
      .update(songs)
      .set(updates)
      .where(eq(songs.id, id))
      .returning();
    
    return result[0];
  }
  async deleteSong(id: string): Promise<boolean> {
    const result = await db
      .delete(songs)
      .where(eq(songs.id, id));
    
    return result.rowCount !== null && result.rowCount > 0;
  }
}