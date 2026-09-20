import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { EmergencyContact } from '../database/types';

export interface EmergencyContactDTO {
  category: string;
  name: string;
  phone: string;
  notes?: string;
}

export const EmergencyContactService = {
  async getContacts(db: SQLiteDatabase, weddingId: string): Promise<EmergencyContact[]> {
    return db.getAllAsync<EmergencyContact>(
      `SELECT * FROM emergency_contacts WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC`,
      [weddingId]
    );
  },

  async getContactById(db: SQLiteDatabase, id: string): Promise<EmergencyContact | null> {
    return db.getFirstAsync<EmergencyContact>(
      `SELECT * FROM emergency_contacts WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
  },

  async addContact(db: SQLiteDatabase, weddingId: string, data: EmergencyContactDTO): Promise<EmergencyContact> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO emergency_contacts (id, wedding_id, category, name, phone, notes, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, weddingId, data.category, data.name, data.phone, data.notes || null, 0, now, now]
    );
    return (await this.getContactById(db, id)) as EmergencyContact;
  },

  async updateContact(db: SQLiteDatabase, id: string, data: EmergencyContactDTO): Promise<EmergencyContact> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE emergency_contacts SET category = ?, name = ?, phone = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [data.category, data.name, data.phone, data.notes || null, now, id]
    );
    return (await this.getContactById(db, id)) as EmergencyContact;
  },

  async deleteContact(db: SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE emergency_contacts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
  },
};
