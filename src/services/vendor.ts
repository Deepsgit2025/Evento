import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Vendor } from '../database/types';
import { SyncEngine } from './syncEngine';
import { ReminderService } from './reminder';

export interface VendorDTO {
  name: string;
  category: string;
  contact_person?: string;
  phone?: string;
  alternate_phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  agreed_amount: number;
}

export const VendorService = {
  async addVendor(db: SQLiteDatabase, weddingId: string, data: VendorDTO): Promise<Vendor> {
    const id = Crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    await db.runAsync(
      `INSERT INTO vendors (
        id, wedding_id, name, category, contact_person, phone, 
        alternate_phone, email, address, notes, agreed_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        weddingId,
        data.name,
        data.category,
        data.contact_person || null,
        data.phone || null,
        data.alternate_phone || null,
        data.email || null,
        data.address || null,
        data.notes || null,
        data.agreed_amount || 0,
        timestamp,
        timestamp
      ]
    );

    await SyncEngine.markPending(db, 'vendors', id, 'CREATE');
    return this.getVendorById(db, id) as Promise<Vendor>;
  },

  async getVendors(
    db: SQLiteDatabase,
    weddingId: string,
    searchQuery?: string,
    categoryFilter?: string
  ): Promise<Vendor[]> {
    let query = `SELECT * FROM vendors WHERE wedding_id = ? AND deleted_at IS NULL`;
    const params: any[] = [weddingId];

    if (categoryFilter && categoryFilter !== 'All') {
      query += ` AND category = ?`;
      params.push(categoryFilter);
    }

    if (searchQuery) {
      query += ` AND (name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)`;
      const searchParam = `%${searchQuery}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY name ASC`;

    return await db.getAllAsync<Vendor>(query, params);
  },

  async getVendorById(db: SQLiteDatabase, id: string): Promise<Vendor | null> {
    return await db.getFirstAsync<Vendor>(`SELECT * FROM vendors WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
  },

  async updateVendor(db: SQLiteDatabase, id: string, data: VendorDTO): Promise<Vendor> {
    const timestamp = Math.floor(Date.now() / 1000);

    await db.runAsync(
      `UPDATE vendors SET 
        name = ?, category = ?, contact_person = ?, phone = ?, 
        alternate_phone = ?, email = ?, address = ?, notes = ?, agreed_amount = ?, updated_at = ?
      WHERE id = ?`,
      [
        data.name,
        data.category,
        data.contact_person || null,
        data.phone || null,
        data.alternate_phone || null,
        data.email || null,
        data.address || null,
        data.notes || null,
        data.agreed_amount || 0,
        timestamp,
        id
      ]
    );

    await SyncEngine.markPending(db, 'vendors', id, 'UPDATE');
    return this.getVendorById(db, id) as Promise<Vendor>;
  },

  async deleteVendor(db: SQLiteDatabase, id: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE vendors SET deleted_at = ?, updated_at = ? WHERE id = ?`, [timestamp, timestamp, id]);
    await SyncEngine.markPending(db, 'vendors', id, 'DELETE');
    
    // EDGE CASE: Cancel OS notifications for this vendor's payments
    const reminders = await db.getAllAsync<{id: string}>(
      `SELECT id FROM reminders WHERE reference_id = ? AND status = 'SCHEDULED' AND deleted_at IS NULL`,
      [id]
    );
    for (const r of reminders) {
      await ReminderService.cancelReminder(db, r.id);
    }
  },

  async getAvailableCategories(db: SQLiteDatabase, weddingId: string): Promise<string[]> {
    const results = await db.getAllAsync<{category: string}>(
      `SELECT DISTINCT category FROM vendors WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY category ASC`, 
      [weddingId]
    );
    return results.map(r => r.category);
  }
};
