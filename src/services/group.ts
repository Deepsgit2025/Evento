import * as SQLite from 'expo-sqlite';
import { GuestGroup } from '../database/types';
import * as Crypto from 'expo-crypto';

export const GroupService = {
  /**
   * Adds a new family/group to the database.
   */
  async addGroup(db: SQLite.SQLiteDatabase, weddingId: string, name: string, side: 'Groom' | 'Bride'): Promise<string> {
    const id = Crypto.randomUUID();
    const count = (await db.getFirstAsync<{c: number}>(`SELECT COUNT(*) as c FROM guest_groups WHERE wedding_id = ? AND side = ?`, [weddingId, side]))?.c || 0;
    
    await db.runAsync(
      `INSERT INTO guest_groups (id, wedding_id, name, side, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [id, weddingId, name.trim(), side, count]
    );

    return id;
  },

  /**
   * Retrieves all groups for a given wedding and side.
   * If side is 'All', retrieves all groups.
   */
  async getGroups(db: SQLite.SQLiteDatabase, weddingId: string, side?: 'All' | 'Groom' | 'Bride'): Promise<GuestGroup[]> {
    if (side && side !== 'All') {
      return await db.getAllAsync<GuestGroup>(
        `SELECT * FROM guest_groups WHERE wedding_id = ? AND side = ? ORDER BY sort_order ASC, name ASC`,
        [weddingId, side]
      );
    }
    
    return await db.getAllAsync<GuestGroup>(
      `SELECT * FROM guest_groups WHERE wedding_id = ? ORDER BY side ASC, sort_order ASC, name ASC`,
      [weddingId]
    );
  },

  /**
   * Updates an existing group.
   */
  async updateGroup(db: SQLite.SQLiteDatabase, id: string, name: string): Promise<void> {
    await db.runAsync(
      `UPDATE guest_groups SET name = ?, updated_at = cast(strftime('%s', 'now') as int) WHERE id = ?`,
      [name.trim(), id]
    );
  },

  /**
   * Bulk updates group sort orders.
   */
  async updateSortOrders(db: SQLite.SQLiteDatabase, updates: { id: string, sort_order: number }[]): Promise<void> {
    for (const update of updates) {
      await db.runAsync(`UPDATE guest_groups SET sort_order = ? WHERE id = ?`, [update.sort_order, update.id]);
    }
  },

  /**
   * Deletes a group safely. Due to ON DELETE SET NULL on guests table, 
   * existing guests will just lose their group association without being deleted.
   */
  async deleteGroup(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM guest_groups WHERE id = ?`, [id]);
  }
};
