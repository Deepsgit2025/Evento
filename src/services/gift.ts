import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Gift } from '../database/types';

export interface GiftDTO {
  giver_name: string;
  guest_id?: string | null;
  description?: string;
  estimated_value?: number;
  date_received?: string;
  notes?: string;
}

export const GiftService = {
  async getGifts(db: SQLiteDatabase, weddingId: string): Promise<Gift[]> {
    return db.getAllAsync<Gift>(
      `SELECT * FROM gifts WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  async addGift(db: SQLiteDatabase, weddingId: string, data: GiftDTO): Promise<Gift> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO gifts (id, wedding_id, guest_id, giver_name, description, estimated_value, date_received, thank_you_sent, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [id, weddingId, data.guest_id || null, data.giver_name, data.description || null, data.estimated_value ?? null, data.date_received || null, data.notes || null, now, now]
    );
    return (await db.getFirstAsync<Gift>(`SELECT * FROM gifts WHERE id = ?`, [id])) as Gift;
  },

  async toggleThankYou(db: SQLiteDatabase, id: string, sent: boolean): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE gifts SET thank_you_sent = ?, updated_at = ? WHERE id = ?`, [sent ? 1 : 0, now, id]);
  },

  async deleteGift(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE gifts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  },
};
