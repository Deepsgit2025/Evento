import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Announcement, AnnouncementPriority } from '../database/types';

export interface AnnouncementDTO {
  title: string;
  message: string;
  event_id?: string | null;
  priority: AnnouncementPriority;
}

export const AnnouncementService = {
  async getAnnouncements(db: SQLiteDatabase, weddingId: string): Promise<Announcement[]> {
    return db.getAllAsync<Announcement>(
      `SELECT * FROM announcements WHERE wedding_id = ? ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  async getActiveAnnouncements(db: SQLiteDatabase, weddingId: string): Promise<Announcement[]> {
    return db.getAllAsync<Announcement>(
      `SELECT * FROM announcements WHERE wedding_id = ? AND status = 'ACTIVE' ORDER BY
         CASE priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
         created_at DESC`,
      [weddingId]
    );
  },

  async createAnnouncement(db: SQLiteDatabase, weddingId: string, data: AnnouncementDTO): Promise<Announcement> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO announcements (id, wedding_id, title, message, event_id, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [id, weddingId, data.title, data.message, data.event_id || null, data.priority, now, now]
    );
    return (await db.getFirstAsync<Announcement>(`SELECT * FROM announcements WHERE id = ?`, [id])) as Announcement;
  },

  async setStatus(db: SQLiteDatabase, id: string, status: 'ACTIVE' | 'EXPIRED'): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE announcements SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);
  },

  async deleteAnnouncement(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM announcements WHERE id = ?`, [id]);
  },
};
