import * as SQLite from 'expo-sqlite';
import { RoomAssignment, Guest, Room } from '../database/types';
import * as Crypto from 'expo-crypto';

export const RoomAssignmentService = {
  /**
   * Calculates the current occupancy of a room by summing the party_size of all assigned guests.
   */
  async getRoomOccupancy(db: SQLite.SQLiteDatabase, roomId: string): Promise<number> {
    const result = await db.getFirstAsync<{ total_occupancy: number }>(
      `SELECT SUM(g.party_size) as total_occupancy 
       FROM room_assignments ra
       JOIN guests g ON ra.guest_id = g.id
       WHERE ra.room_id = ?`,
      [roomId]
    );
    return result?.total_occupancy || 0;
  },

  /**
   * Assigns a guest to a room or moves them to a new room. Validates capacity.
   */
  async assignGuest(db: SQLite.SQLiteDatabase, guestId: string, roomId: string, notes?: string): Promise<void> {
    // 1. Fetch guest party size
    const guest = await db.getFirstAsync<Guest>(`SELECT party_size FROM guests WHERE id = ?`, [guestId]);
    if (!guest) throw new Error("Guest not found.");

    // 2. Fetch room capacity
    const room = await db.getFirstAsync<Room>(`SELECT capacity FROM rooms WHERE id = ?`, [roomId]);
    if (!room) throw new Error("Room not found.");

    // 3. Fetch current assignment if exists (to handle moving)
    const currentAssignment = await db.getFirstAsync<RoomAssignment>(
      `SELECT * FROM room_assignments WHERE guest_id = ?`,
      [guestId]
    );

    // If moving to the same room, just update notes
    if (currentAssignment && currentAssignment.room_id === roomId) {
      await db.runAsync(
        `UPDATE room_assignments SET notes = ?, updated_at = cast(strftime('%s', 'now') as int) WHERE id = ?`,
        [notes || null, currentAssignment.id]
      );
      return;
    }

    // 4. Check capacity of the target room
    const currentOccupancy = await this.getRoomOccupancy(db, roomId);
    if (currentOccupancy + guest.party_size > room.capacity) {
      throw new Error("Room is full.");
    }

    // 5. Insert or Replace Assignment
    // Using UPSERT (INSERT OR REPLACE) due to UNIQUE constraint on guest_id
    const id = currentAssignment ? currentAssignment.id : Crypto.randomUUID();
    
    await db.runAsync(
      `INSERT OR REPLACE INTO room_assignments (
        id, room_id, guest_id, notes, updated_at
      ) VALUES (?, ?, ?, ?, cast(strftime('%s', 'now') as int))`,
      [id, roomId, guestId, notes || null]
    );
  },

  /**
   * Removes a guest from a room.
   */
  async removeAssignment(db: SQLite.SQLiteDatabase, guestId: string): Promise<void> {
    await db.runAsync(`DELETE FROM room_assignments WHERE guest_id = ?`, [guestId]);
  },

  /**
   * Gets all assignments for a specific room.
   */
  async getAssignmentsByRoom(db: SQLite.SQLiteDatabase, roomId: string): Promise<(RoomAssignment & { guest_name: string; party_size: number })[]> {
    return await db.getAllAsync<RoomAssignment & { guest_name: string; party_size: number }>(
      `SELECT ra.*, g.full_name as guest_name, g.party_size 
       FROM room_assignments ra
       JOIN guests g ON ra.guest_id = g.id
       WHERE ra.room_id = ?
       ORDER BY g.full_name ASC`,
      [roomId]
    );
  },

  /**
   * Gets the room assignment for a specific guest, including hotel and room details.
   */
  async getGuestAssignment(db: SQLite.SQLiteDatabase, guestId: string): Promise<(RoomAssignment & { room_number: string; hotel_name: string }) | null> {
    return await db.getFirstAsync<RoomAssignment & { room_number: string; hotel_name: string }>(
      `SELECT ra.*, r.room_number, h.name as hotel_name 
       FROM room_assignments ra
       JOIN rooms r ON ra.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE ra.guest_id = ?`,
      [guestId]
    );
  },

  /**
   * Gets all guests who do NOT have a room assignment.
   */
  async getUnassignedGuests(db: SQLite.SQLiteDatabase, weddingId: string): Promise<Guest[]> {
    return await db.getAllAsync<Guest>(
      `SELECT g.* FROM guests g
       LEFT JOIN room_assignments ra ON g.id = ra.guest_id
       WHERE g.wedding_id = ? AND ra.id IS NULL
       ORDER BY g.full_name ASC`,
      [weddingId]
    );
  }
};
