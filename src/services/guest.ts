import * as SQLite from 'expo-sqlite';
import { Guest } from '../database/types';
import * as Crypto from 'expo-crypto';

export interface AddGuestParams {
  wedding_id: string;
  full_name: string;
  phone?: string;
  alternate_phone?: string;
  side: 'Groom' | 'Bride';
  group_id?: string | null;
  party_size?: number;
  notes?: string;
}

export const GuestService = {
  /**
   * Adds a new guest to the database.
   */
  async addGuest(db: SQLite.SQLiteDatabase, params: AddGuestParams): Promise<string> {
    const id = Crypto.randomUUID();
    const party_size = params.party_size && params.party_size > 0 ? params.party_size : 1;
    
    await db.runAsync(
      `INSERT INTO guests (
        id, wedding_id, full_name, phone, alternate_phone, 
        side, group_id, party_size, rsvp_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.wedding_id,
        params.full_name.trim(),
        params.phone?.trim() || null,
        params.alternate_phone?.trim() || null,
        params.side,
        params.group_id || null,
        party_size,
        'PENDING',
        params.notes?.trim() || null,
      ]
    );

    return id;
  },

  /**
   * Retrieves all guests for a given wedding.
   */
  async getGuests(db: SQLite.SQLiteDatabase, weddingId: string): Promise<Guest[]> {
    return await db.getAllAsync<Guest>(
      `SELECT * FROM guests WHERE wedding_id = ? ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  /**
   * Searches guests by name or phone.
   */
  async searchGuests(db: SQLite.SQLiteDatabase, weddingId: string, searchQuery: string): Promise<Guest[]> {
    const likeQuery = `%${searchQuery.trim()}%`;
    return await db.getAllAsync<Guest>(
      `SELECT * FROM guests 
       WHERE wedding_id = ? 
       AND (full_name LIKE ? OR phone LIKE ?)
       ORDER BY full_name ASC`,
      [weddingId, likeQuery, likeQuery]
    );
  },

  /**
   * Retrieves a single guest by ID.
   */
  async getGuestById(db: SQLite.SQLiteDatabase, id: string): Promise<Guest | null> {
    return await db.getFirstAsync<Guest>(`SELECT * FROM guests WHERE id = ?`, [id]);
  },

  /**
   * Updates an existing guest.
   */
  async updateGuest(db: SQLite.SQLiteDatabase, id: string, params: Partial<AddGuestParams> & { rsvp_status?: 'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE' }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (params.full_name !== undefined) {
      fields.push('full_name = ?');
      values.push(params.full_name.trim());
    }
    if (params.phone !== undefined) {
      fields.push('phone = ?');
      values.push(params.phone?.trim() || null);
    }
    if (params.alternate_phone !== undefined) {
      fields.push('alternate_phone = ?');
      values.push(params.alternate_phone?.trim() || null);
    }
    if (params.side !== undefined) {
      fields.push('side = ?');
      values.push(params.side);
    }
    if (params.group_id !== undefined) {
      fields.push('group_id = ?');
      values.push(params.group_id || null);
    }
    if (params.party_size !== undefined) {
      fields.push('party_size = ?');
      values.push(params.party_size && params.party_size > 0 ? params.party_size : 1);
    }
    if (params.rsvp_status !== undefined) {
      fields.push('rsvp_status = ?');
      values.push(params.rsvp_status);
    }
    if (params.notes !== undefined) {
      fields.push('notes = ?');
      values.push(params.notes?.trim() || null);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = cast(strftime('%s', 'now') as int)");
    values.push(id);

    await db.runAsync(`UPDATE guests SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async deleteGuest(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`DELETE FROM guests WHERE id = ?`, [id]);
  },

  /**
   * Bulk assigns a group to multiple guests.
   * Optionally updates their side to match the group's side.
   */
  async bulkAssignGroup(db: SQLite.SQLiteDatabase, guestIds: string[], groupId: string | null, side?: 'Groom' | 'Bride'): Promise<void> {
    if (guestIds.length === 0) return;
    
    // SQLite doesn't natively support array binding easily for UPDATE WHERE IN (?), so we build the placeholders
    const placeholders = guestIds.map(() => '?').join(',');
    const now = Math.floor(Date.now() / 1000);
    
    if (side) {
      await db.runAsync(
        `UPDATE guests SET group_id = ?, side = ?, updated_at = ? WHERE id IN (${placeholders})`,
        [groupId, side, now, ...guestIds]
      );
    } else {
      await db.runAsync(
        `UPDATE guests SET group_id = ?, updated_at = ? WHERE id IN (${placeholders})`,
        [groupId, now, ...guestIds]
      );
    }
  }
};
