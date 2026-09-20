import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { TransportRequest, TransportStatus } from '../database/types';

export interface TransportRequestDTO {
  guest_id?: string | null;
  guest_name?: string;
  pickup_location?: string;
  drop_location?: string;
  requested_time?: string;
  vehicle_info?: string;
  notes?: string;
}

export const TransportService = {
  async getRequests(db: SQLiteDatabase, weddingId: string): Promise<TransportRequest[]> {
    return db.getAllAsync<TransportRequest>(
      `SELECT * FROM transport_requests WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  async addRequest(db: SQLiteDatabase, weddingId: string, data: TransportRequestDTO): Promise<TransportRequest> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO transport_requests (id, wedding_id, guest_id, guest_name, pickup_location, drop_location, requested_time, vehicle_info, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [id, weddingId, data.guest_id || null, data.guest_name || null, data.pickup_location || null, data.drop_location || null, data.requested_time || null, data.vehicle_info || null, data.notes || null, now, now]
    );
    return (await db.getFirstAsync<TransportRequest>(`SELECT * FROM transport_requests WHERE id = ?`, [id])) as TransportRequest;
  },

  async updateStatus(db: SQLiteDatabase, id: string, status: TransportStatus, vehicleInfo?: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    if (vehicleInfo !== undefined) {
      await db.runAsync(`UPDATE transport_requests SET status = ?, vehicle_info = ?, updated_at = ? WHERE id = ?`, [status, vehicleInfo, now, id]);
    } else {
      await db.runAsync(`UPDATE transport_requests SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);
    }
  },

  async deleteRequest(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE transport_requests SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  },
};
