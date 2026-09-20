import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { WeddingPhoto } from '../database/types';

export const PhotoService = {
  async getPhotos(db: SQLiteDatabase, weddingId: string): Promise<WeddingPhoto[]> {
    return db.getAllAsync<WeddingPhoto>(
      `SELECT * FROM wedding_photos WHERE wedding_id = ? ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  async getPhotosGroupedByEvent(db: SQLiteDatabase, weddingId: string): Promise<{ eventId: string | null; eventName: string; photos: WeddingPhoto[] }[]> {
    const rows = await db.getAllAsync<WeddingPhoto & { event_name: string | null }>(
      `SELECT wp.*, e.name as event_name FROM wedding_photos wp
       LEFT JOIN events e ON wp.event_id = e.id
       WHERE wp.wedding_id = ?
       ORDER BY wp.created_at DESC`,
      [weddingId]
    );

    const groups = new Map<string, { eventId: string | null; eventName: string; photos: WeddingPhoto[] }>();
    for (const row of rows) {
      const key = row.event_id || 'unsorted';
      if (!groups.has(key)) {
        groups.set(key, { eventId: row.event_id, eventName: row.event_name || 'Unsorted', photos: [] });
      }
      groups.get(key)!.photos.push(row);
    }
    return Array.from(groups.values());
  },

  async addPhoto(db: SQLiteDatabase, weddingId: string, uri: string, eventId?: string | null, caption?: string): Promise<WeddingPhoto> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO wedding_photos (id, wedding_id, event_id, uri, caption, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, weddingId, eventId || null, uri, caption || null, now]
    );
    return (await db.getFirstAsync<WeddingPhoto>(`SELECT * FROM wedding_photos WHERE id = ?`, [id])) as WeddingPhoto;
  },

  async deletePhoto(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM wedding_photos WHERE id = ?`, [id]);
  },
};
