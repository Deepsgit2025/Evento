import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Vendor, Event, VendorArrivalStatus } from '../database/types';

export interface VendorArrivalRow {
  assignment_id: string;
  vendor_id: string;
  vendor_name: string;
  category: string;
  phone: string | null;
  event_id: string;
  event_name: string;
  event_date: string | null;
  status: VendorArrivalStatus;
  expected_arrival: string | null;
  actual_arrival: string | null;
  notes: string | null;
}

export const VendorEventService = {
  async assignVendorToEvent(db: SQLiteDatabase, vendorId: string, eventId: string): Promise<void> {
    const id = Crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    // UNIQUE constraint will catch duplicates
    await db.runAsync(
      `INSERT INTO vendor_events (id, vendor_id, event_id, created_at) VALUES (?, ?, ?, ?)`,
      [id, vendorId, eventId, timestamp]
    );
  },

  async unassignVendorFromEvent(db: SQLiteDatabase, vendorId: string, eventId: string): Promise<void> {
    await db.runAsync(
      `DELETE FROM vendor_events WHERE vendor_id = ? AND event_id = ?`,
      [vendorId, eventId]
    );
  },

  async getEventsForVendor(db: SQLiteDatabase, vendorId: string): Promise<Event[]> {
    return await db.getAllAsync<Event>(
      `SELECT e.* FROM events e 
       JOIN vendor_events ve ON e.id = ve.event_id 
       WHERE ve.vendor_id = ? 
       ORDER BY e.date ASC, e.start_time ASC`,
      [vendorId]
    );
  },

  async getVendorsForEvent(db: SQLiteDatabase, eventId: string): Promise<Vendor[]> {
    return await db.getAllAsync<Vendor>(
      `SELECT v.* FROM vendors v 
       JOIN vendor_events ve ON v.id = ve.vendor_id 
       WHERE ve.event_id = ? 
       ORDER BY v.name ASC`,
      [eventId]
    );
  },
  
  async getUnassignedEventsForVendor(db: SQLiteDatabase, weddingId: string, vendorId: string): Promise<Event[]> {
    return await db.getAllAsync<Event>(
      `SELECT e.* FROM events e 
       WHERE e.wedding_id = ? AND e.id NOT IN (
         SELECT event_id FROM vendor_events WHERE vendor_id = ?
       )
       ORDER BY e.date ASC, e.start_time ASC`,
      [weddingId, vendorId]
    );
  },

  async getUnassignedVendorsForEvent(db: SQLiteDatabase, weddingId: string, eventId: string): Promise<Vendor[]> {
    return await db.getAllAsync<Vendor>(
      `SELECT v.* FROM vendors v
       WHERE v.wedding_id = ? AND v.id NOT IN (
         SELECT vendor_id FROM vendor_events WHERE event_id = ?
       )
       ORDER BY v.name ASC`,
      [weddingId, eventId]
    );
  },

  /** All vendor-event assignments for a wedding, with arrival status, for the Vendor Arrival Tracker. */
  async getArrivalsForWedding(db: SQLiteDatabase, weddingId: string): Promise<VendorArrivalRow[]> {
    return await db.getAllAsync<VendorArrivalRow>(
      `SELECT
         ve.id as assignment_id, v.id as vendor_id, v.name as vendor_name, v.category as category,
         v.phone as phone, e.id as event_id, e.name as event_name, e.date as event_date,
         COALESCE(ve.status, 'NOT_ARRIVED') as status, ve.expected_arrival, ve.actual_arrival, ve.notes
       FROM vendor_events ve
       JOIN vendors v ON v.id = ve.vendor_id
       JOIN events e ON e.id = ve.event_id
       WHERE v.wedding_id = ? AND v.deleted_at IS NULL
       ORDER BY e.date ASC, e.start_time ASC, v.name ASC`,
      [weddingId]
    );
  },

  async updateArrivalStatus(
    db: SQLiteDatabase,
    assignmentId: string,
    status: VendorArrivalStatus,
    extra?: { expected_arrival?: string | null; actual_arrival?: string | null; notes?: string | null }
  ): Promise<void> {
    const fields = ['status = ?'];
    const values: any[] = [status];
    if (extra?.expected_arrival !== undefined) { fields.push('expected_arrival = ?'); values.push(extra.expected_arrival); }
    if (extra?.actual_arrival !== undefined) { fields.push('actual_arrival = ?'); values.push(extra.actual_arrival); }
    if (extra?.notes !== undefined) { fields.push('notes = ?'); values.push(extra.notes); }
    values.push(assignmentId);
    await db.runAsync(`UPDATE vendor_events SET ${fields.join(', ')} WHERE id = ?`, values);
  },
};
