import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { InventoryItem, InventoryStatus } from '../database/types';

export interface InventoryItemDTO {
  name: string;
  category: string;
  quantity: number;
  available_quantity?: number;
  location?: string;
  owner_source?: string;
  notes?: string;
}

export const InventoryService = {
  async getItems(db: SQLiteDatabase, weddingId: string): Promise<InventoryItem[]> {
    return db.getAllAsync<InventoryItem>(
      `SELECT * FROM inventory_items WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY category ASC, name ASC`,
      [weddingId]
    );
  },

  async addItem(db: SQLiteDatabase, weddingId: string, data: InventoryItemDTO): Promise<InventoryItem> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const available = data.available_quantity ?? data.quantity;
    await db.runAsync(
      `INSERT INTO inventory_items (id, wedding_id, name, category, quantity, available_quantity, location, owner_source, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OK', ?, ?)`,
      [id, weddingId, data.name, data.category, data.quantity, available, data.location || null, data.owner_source || null, now, now]
    );
    return (await db.getFirstAsync<InventoryItem>(`SELECT * FROM inventory_items WHERE id = ?`, [id])) as InventoryItem;
  },

  async updateItem(db: SQLiteDatabase, id: string, data: InventoryItemDTO): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE inventory_items SET name = ?, category = ?, quantity = ?, available_quantity = ?, location = ?, owner_source = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [data.name, data.category, data.quantity, data.available_quantity ?? data.quantity, data.location || null, data.owner_source || null, data.notes || null, now, id]
    );
  },

  async adjustQuantity(db: SQLiteDatabase, id: string, delta: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const item = await db.getFirstAsync<InventoryItem>(`SELECT * FROM inventory_items WHERE id = ?`, [id]);
    if (!item) return;
    const newAvailable = Math.max(0, Math.min(item.quantity, item.available_quantity + delta));
    await db.runAsync(`UPDATE inventory_items SET available_quantity = ?, updated_at = ? WHERE id = ?`, [newAvailable, now, id]);
  },

  async transferLocation(db: SQLiteDatabase, id: string, newLocation: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE inventory_items SET location = ?, updated_at = ? WHERE id = ?`, [newLocation, now, id]);
  },

  async setStatus(db: SQLiteDatabase, id: string, status: InventoryStatus): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE inventory_items SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);
  },

  async deleteItem(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE inventory_items SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  },
};
