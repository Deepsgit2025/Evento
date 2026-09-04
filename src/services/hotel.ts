import * as SQLite from 'expo-sqlite';
import { Hotel } from '../database/types';
import * as Crypto from 'expo-crypto';

export interface AddHotelParams {
  wedding_id: string;
  name: string;
  address?: string;
  notes?: string;
}

export const HotelService = {
  /**
   * Adds a new hotel to the database.
   */
  async addHotel(db: SQLite.SQLiteDatabase, params: AddHotelParams): Promise<string> {
    const id = Crypto.randomUUID();
    
    await db.runAsync(
      `INSERT INTO hotels (
        id, wedding_id, name, address, notes
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        params.wedding_id,
        params.name.trim(),
        params.address?.trim() || null,
        params.notes?.trim() || null,
      ]
    );

    return id;
  },

  /**
   * Retrieves all hotels for a given wedding.
   */
  async getHotels(db: SQLite.SQLiteDatabase, weddingId: string): Promise<Hotel[]> {
    return await db.getAllAsync<Hotel>(
      `SELECT * FROM hotels WHERE wedding_id = ? ORDER BY name ASC`,
      [weddingId]
    );
  },

  /**
   * Deletes a hotel. (Cascades to rooms)
   */
  async deleteHotel(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM hotels WHERE id = ?`, [id]);
  }
};
