import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Vendor, Event } from '../database/types';

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
  }
};
