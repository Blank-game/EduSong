import { type Document, type InsertDocument, type Song, type InsertSong } from "@shared/schema";
import { randomUUID } from "crypto";
import { PostgresStorage } from "./db";

export interface IStorage {
  
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  
  getSongs(): Promise<Song[]>;
  getSong(id: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  deleteSong(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private songs: Map<string, Song>;

  constructor() {
    this.documents = new Map();
    this.songs = new Map();
  }

  
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  
  async getSongs(): Promise<Song[]> {
    return Array.from(this.songs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSong(id: string): Promise<Song | undefined> {
    return this.songs.get(id);
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
    this.songs.set(id, song);
    return song;
  }

  async updateSong(
  id: string,
  updates: Partial<Song>
): Promise<Song | undefined> {
  const existing = this.songs.get(id);
  if (!existing) return undefined;

  const updated: Song = {
    ...existing,
    ...updates,
  };

  this.songs.set(id, updated);
  return updated;
}


  async deleteSong(id: string): Promise<boolean> {
    return this.songs.delete(id);
  }
}


export const storage: IStorage = process.env.DATABASE_URL
  ? new PostgresStorage()
  : new MemStorage();


  console.log("Using storage:", `${process.env.DATABASE_URL ? 'PostgreSQL' : 'In-Memory'}`);


