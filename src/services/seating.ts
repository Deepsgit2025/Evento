import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { SeatingTable, Guest } from '../database/types';

export interface SeatingTableDTO {
  name: string;
  capacity: number;
  notes?: string;
}

export interface SeatingTableWithGuests extends SeatingTable {
  guests: Guest[];
  seatsUsed: number;
}

export const SeatingService = {
  async getTables(db: SQLiteDatabase, weddingId: string): Promise<SeatingTable[]> {
    return db.getAllAsync<SeatingTable>(
      `SELECT * FROM seating_tables WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [weddingId]
    );
  },

  async getTablesWithGuests(db: SQLiteDatabase, weddingId: string): Promise<SeatingTableWithGuests[]> {
    const tables = await this.getTables(db, weddingId);
    const result: SeatingTableWithGuests[] = [];
    for (const table of tables) {
      const guests = await db.getAllAsync<Guest>(
        `SELECT g.* FROM guests g JOIN seating_assignments sa ON g.id = sa.guest_id WHERE sa.table_id = ? ORDER BY g.full_name ASC`,
        [table.id]
      );
      const seatsUsed = guests.reduce((sum, g) => sum + (g.party_size || 1), 0);
      result.push({ ...table, guests, seatsUsed });
    }
    return result;
  },

  async getUnseatedGuests(db: SQLiteDatabase, weddingId: string): Promise<Guest[]> {
    return db.getAllAsync<Guest>(
      `SELECT * FROM guests WHERE wedding_id = ? AND id NOT IN (SELECT guest_id FROM seating_assignments) ORDER BY full_name ASC`,
      [weddingId]
    );
  },

  async addTable(db: SQLiteDatabase, weddingId: string, data: SeatingTableDTO): Promise<SeatingTable> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO seating_tables (id, wedding_id, name, capacity, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, weddingId, data.name, data.capacity, data.notes || null, now, now]
    );
    return (await db.getFirstAsync<SeatingTable>(`SELECT * FROM seating_tables WHERE id = ?`, [id])) as SeatingTable;
  },

  async updateTable(db: SQLiteDatabase, id: string, data: SeatingTableDTO): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE seating_tables SET name = ?, capacity = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [data.name, data.capacity, data.notes || null, now, id]
    );
  },

  async deleteTable(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE seating_tables SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    await db.runAsync(`DELETE FROM seating_assignments WHERE table_id = ?`, [id]);
  },

  async assignGuest(db: SQLiteDatabase, tableId: string, guestId: string): Promise<void> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    // A guest can only sit at one table — replace any existing assignment.
    await db.runAsync(`DELETE FROM seating_assignments WHERE guest_id = ?`, [guestId]);
    await db.runAsync(
      `INSERT INTO seating_assignments (id, table_id, guest_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, tableId, guestId, now]
    );
  },

  async unassignGuest(db: SQLiteDatabase, guestId: string): Promise<void> {
    await db.runAsync(`DELETE FROM seating_assignments WHERE guest_id = ?`, [guestId]);
  },
};
