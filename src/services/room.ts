import * as SQLite from 'expo-sqlite';
import { Room } from '../database/types';
import * as Crypto from 'expo-crypto';

export interface AddRoomParams {
  hotel_id: string;
  room_number: string;
  room_type?: string;
  capacity: number;
  notes?: string;
}

export const RoomService = {
  /**
   * Adds a new room to a hotel.
   */
  async addRoom(db: SQLite.SQLiteDatabase, params: AddRoomParams): Promise<string> {
    const id = Crypto.randomUUID();
    
    await db.runAsync(
      `INSERT INTO rooms (
        id, hotel_id, room_number, room_type, capacity, notes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.hotel_id,
        params.room_number.trim(),
        params.room_type?.trim() || null,
        params.capacity,
        params.notes?.trim() || null,
      ]
    );

    return id;
  },

  /**
   * Retrieves all rooms for a specific hotel.
   */
  async getRoomsByHotel(db: SQLite.SQLiteDatabase, hotelId: string): Promise<Room[]> {
    return await db.getAllAsync<Room>(
      `SELECT * FROM rooms WHERE hotel_id = ? ORDER BY room_number ASC`,
      [hotelId]
    );
  },

  /**
   * Retrieves all rooms for an entire wedding.
   */
  async getRoomsByWedding(db: SQLite.SQLiteDatabase, weddingId: string): Promise<Room[]> {
    // Join hotels to filter by wedding_id
    return await db.getAllAsync<Room>(
      `SELECT r.* FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE h.wedding_id = ?
       ORDER BY h.name ASC, r.room_number ASC`,
      [weddingId]
    );
  },

  /**
   * Deletes a room.
   */
  async deleteRoom(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM rooms WHERE id = ?`, [id]);
  }
};
