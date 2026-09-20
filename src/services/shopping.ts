import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { ShoppingItem } from '../database/types';

export interface ShoppingItemDTO {
  title: string;
  category?: string;
  estimated_cost?: number;
  assigned_to?: string;
  notes?: string;
}

export const ShoppingService = {
  async getItems(db: SQLiteDatabase, weddingId: string): Promise<ShoppingItem[]> {
    return db.getAllAsync<ShoppingItem>(
      `SELECT * FROM shopping_items WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY purchased ASC, created_at DESC`,
      [weddingId]
    );
  },

  async addItem(db: SQLiteDatabase, weddingId: string, data: ShoppingItemDTO): Promise<ShoppingItem> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO shopping_items (id, wedding_id, title, category, estimated_cost, purchased, assigned_to, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [id, weddingId, data.title, data.category || null, data.estimated_cost ?? null, data.assigned_to || null, data.notes || null, now, now]
    );
    return (await db.getFirstAsync<ShoppingItem>(`SELECT * FROM shopping_items WHERE id = ?`, [id])) as ShoppingItem;
  },

  async togglePurchased(db: SQLiteDatabase, id: string, purchased: boolean): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE shopping_items SET purchased = ?, updated_at = ? WHERE id = ?`, [purchased ? 1 : 0, now, id]);
  },

  async deleteItem(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE shopping_items SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  },
};
