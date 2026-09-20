import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { WeddingDocument } from '../database/types';

export interface WeddingDocumentDTO {
  title: string;
  category: string;
  file_uri: string;
  file_name?: string;
  mime_type?: string;
  notes?: string;
}

export const DocumentService = {
  async getDocuments(db: SQLiteDatabase, weddingId: string): Promise<WeddingDocument[]> {
    return db.getAllAsync<WeddingDocument>(
      `SELECT * FROM documents WHERE wedding_id = ? ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  async addDocument(db: SQLiteDatabase, weddingId: string, data: WeddingDocumentDTO): Promise<WeddingDocument> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO documents (id, wedding_id, title, category, file_uri, file_name, mime_type, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, weddingId, data.title, data.category, data.file_uri, data.file_name || null, data.mime_type || null, data.notes || null, now]
    );
    return (await db.getFirstAsync<WeddingDocument>(`SELECT * FROM documents WHERE id = ?`, [id])) as WeddingDocument;
  },

  async deleteDocument(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM documents WHERE id = ?`, [id]);
  },
};
