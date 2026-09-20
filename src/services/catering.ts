import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { CateringItem, CateringStatus } from '../database/types';

export interface CateringItemDTO {
  name: string;
  category: string;
  event_id?: string | null;
  guest_count_estimate?: number;
  notes?: string;
}

export const CateringService = {
  async getItems(db: SQLiteDatabase, weddingId: string): Promise<CateringItem[]> {
    return db.getAllAsync<CateringItem>(
      `SELECT * FROM catering_items WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [weddingId]
    );
  },

  async addItem(db: SQLiteDatabase, weddingId: string, data: CateringItemDTO): Promise<CateringItem> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO catering_items (id, wedding_id, event_id, name, category, guest_count_estimate, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PLANNED', ?, ?, ?)`,
      [id, weddingId, data.event_id || null, data.name, data.category, data.guest_count_estimate ?? null, data.notes || null, now, now]
    );
    return (await db.getFirstAsync<CateringItem>(`SELECT * FROM catering_items WHERE id = ?`, [id])) as CateringItem;
  },

  async setStatus(db: SQLiteDatabase, id: string, status: CateringStatus): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE catering_items SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);
  },

  async deleteItem(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE catering_items SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  },
};
