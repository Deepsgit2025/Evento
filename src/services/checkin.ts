import { SQLiteDatabase } from 'expo-sqlite';
import { Guest } from '../database/types';

export interface CheckinStats {
  totalInvited: number;
  totalPeople: number;
  checkedInGuests: number;
  checkedInPeople: number;
  percentage: number;
}

export const CheckinService = {
  async getStats(db: SQLiteDatabase, weddingId: string): Promise<CheckinStats> {
    const totals = await db.getFirstAsync<{ count: number; people: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(party_size), 0) as people FROM guests WHERE wedding_id = ?`,
      [weddingId]
    );
    const checkedIn = await db.getFirstAsync<{ count: number; people: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(party_size), 0) as people FROM guests WHERE wedding_id = ? AND checked_in_at IS NOT NULL`,
      [weddingId]
    );
    const totalInvited = totals?.count || 0;
    const totalPeople = totals?.people || 0;
    const checkedInGuests = checkedIn?.count || 0;
    const checkedInPeople = checkedIn?.people || 0;
    return {
      totalInvited,
      totalPeople,
      checkedInGuests,
      checkedInPeople,
      percentage: totalPeople > 0 ? Math.round((checkedInPeople / totalPeople) * 100) : 0,
    };
  },

  async search(db: SQLiteDatabase, weddingId: string, query: string): Promise<Guest[]> {
    const q = `%${query.trim()}%`;
    return db.getAllAsync<Guest>(
      `SELECT * FROM guests WHERE wedding_id = ? AND (full_name LIKE ? OR phone LIKE ? OR checkin_code LIKE ?) ORDER BY full_name ASC LIMIT 30`,
      [weddingId, q, q, q]
    );
  },

  async getRecent(db: SQLiteDatabase, weddingId: string): Promise<Guest[]> {
    return db.getAllAsync<Guest>(
      `SELECT * FROM guests WHERE wedding_id = ? AND checked_in_at IS NOT NULL ORDER BY checked_in_at DESC LIMIT 10`,
      [weddingId]
    );
  },

  async checkIn(db: SQLiteDatabase, guestId: string, checkedInBy?: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE guests SET checked_in_at = ?, checked_in_by = ? WHERE id = ?`, [now, checkedInBy || null, guestId]);
  },

  async undoCheckIn(db: SQLiteDatabase, guestId: string): Promise<void> {
    await db.runAsync(`UPDATE guests SET checked_in_at = NULL, checked_in_by = NULL WHERE id = ?`, [guestId]);
  },
};
