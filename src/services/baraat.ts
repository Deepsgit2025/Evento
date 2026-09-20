import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { BaraatTrip, BaraatStatus, Guest } from '../database/types';

export interface BaraatTripDTO {
  vehicle: string;
  driver_name?: string;
  driver_phone?: string;
  pickup_location?: string;
  destination?: string;
  capacity?: number;
  estimated_arrival?: string;
  notes?: string;
}

export const BaraatService = {
  async getTrips(db: SQLiteDatabase, weddingId: string): Promise<BaraatTrip[]> {
    return db.getAllAsync<BaraatTrip>(
      `SELECT * FROM baraat_trips WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [weddingId]
    );
  },

  async getTripById(db: SQLiteDatabase, id: string): Promise<BaraatTrip | null> {
    return db.getFirstAsync<BaraatTrip>(`SELECT * FROM baraat_trips WHERE id = ? AND deleted_at IS NULL`, [id]);
  },

  async addTrip(db: SQLiteDatabase, weddingId: string, data: BaraatTripDTO): Promise<BaraatTrip> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO baraat_trips (
        id, wedding_id, vehicle, driver_name, driver_phone, pickup_location, destination,
        capacity, status, estimated_arrival, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PREPARING', ?, ?, ?, ?)`,
      [
        id, weddingId, data.vehicle, data.driver_name || null, data.driver_phone || null,
        data.pickup_location || null, data.destination || null, data.capacity || null,
        data.estimated_arrival || null, data.notes || null, now, now
      ]
    );
    return (await this.getTripById(db, id)) as BaraatTrip;
  },

  async updateTrip(db: SQLiteDatabase, id: string, data: BaraatTripDTO): Promise<BaraatTrip> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE baraat_trips SET vehicle = ?, driver_name = ?, driver_phone = ?, pickup_location = ?,
        destination = ?, capacity = ?, estimated_arrival = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [
        data.vehicle, data.driver_name || null, data.driver_phone || null, data.pickup_location || null,
        data.destination || null, data.capacity || null, data.estimated_arrival || null, data.notes || null,
        now, id
      ]
    );
    return (await this.getTripById(db, id)) as BaraatTrip;
  },

  async updateStatus(db: SQLiteDatabase, id: string, status: BaraatStatus): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE baraat_trips SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);
  },

  async deleteTrip(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE baraat_trips SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  },

  async getAssignedGuests(db: SQLiteDatabase, tripId: string): Promise<Guest[]> {
    return db.getAllAsync<Guest>(
      `SELECT g.* FROM guests g JOIN baraat_trip_guests btg ON g.id = btg.guest_id WHERE btg.trip_id = ? ORDER BY g.full_name ASC`,
      [tripId]
    );
  },

  async assignGuest(db: SQLiteDatabase, tripId: string, guestId: string): Promise<void> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT OR IGNORE INTO baraat_trip_guests (id, trip_id, guest_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, tripId, guestId, now]
    );
  },

  async unassignGuest(db: SQLiteDatabase, tripId: string, guestId: string): Promise<void> {
    await db.runAsync(`DELETE FROM baraat_trip_guests WHERE trip_id = ? AND guest_id = ?`, [tripId, guestId]);
  },
};
