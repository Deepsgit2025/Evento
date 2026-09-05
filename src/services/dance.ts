import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Dance } from '../database/types';
import { ReminderService } from './reminder';
import { SyncEngine } from './syncEngine';

export interface DanceDTO {
  title: string;
  group_name?: string | null;
  member_count?: number | null;
  performers?: string | null;
  song_title?: string | null;
  song_artist?: string | null;
  choreographer?: string | null;
  practice_time?: number | null;
  reminder_style?: 'ALARM' | 'MESSAGE' | null;
  notes?: string | null;
}

export const DanceService = {
  async getDances(db: SQLiteDatabase, weddingId: string): Promise<Dance[]> {
    return db.getAllAsync<Dance>(
      `SELECT * FROM dances WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC`,
      [weddingId]
    );
  },

  async getDanceById(db: SQLiteDatabase, id: string): Promise<Dance | null> {
    return db.getFirstAsync<Dance>(`SELECT * FROM dances WHERE id = ? LIMIT 1`, [id]);
  },

  async createDance(db: SQLiteDatabase, weddingId: string, data: DanceDTO): Promise<Dance> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const maxOrder = await db.getFirstAsync<{ m: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) as m FROM dances WHERE wedding_id = ?`,
      [weddingId]
    );
    const sortOrder = (maxOrder?.m ?? -1) + 1;

    let reminderId: string | null = null;
    if (data.practice_time && data.reminder_style) {
      reminderId = await ReminderService.createReminder(db, {
        wedding_id: weddingId,
        type: 'DANCE',
        reference_id: id,
        title: `Practice: ${data.title}`,
        notes: data.notes || null,
        reminder_time: data.practice_time,
      }, data.reminder_style);
    }

    await db.runAsync(
      `INSERT INTO dances (id, wedding_id, title, group_name, member_count, performers, song_title, song_artist, choreographer, practice_time, reminder_style, reminder_id, notes, sort_order, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, weddingId, data.title, data.group_name || null, data.member_count ?? null, data.performers || null,
        data.song_title || null, data.song_artist || null,
        data.choreographer || null, data.practice_time || null, data.reminder_style || null, reminderId,
        data.notes || null, sortOrder, now, now]
    );

    await SyncEngine.markPending(db, 'dances', id, 'CREATE');
    return this.getDanceById(db, id) as Promise<Dance>;
  },

  async updateDance(db: SQLiteDatabase, id: string, weddingId: string, data: DanceDTO): Promise<Dance> {
    const existing = await this.getDanceById(db, id);
    const now = Math.floor(Date.now() / 1000);

    if (existing?.reminder_id) {
      await ReminderService.cancelReminder(db, existing.reminder_id);
    }
    let reminderId: string | null = null;
    if (data.practice_time && data.reminder_style) {
      reminderId = await ReminderService.createReminder(db, {
        wedding_id: weddingId,
        type: 'DANCE',
        reference_id: id,
        title: `Practice: ${data.title}`,
        notes: data.notes || null,
        reminder_time: data.practice_time,
      }, data.reminder_style);
    }

    await db.runAsync(
      `UPDATE dances SET title = ?, group_name = ?, member_count = ?, performers = ?, song_title = ?, song_artist = ?, choreographer = ?,
        practice_time = ?, reminder_style = ?, reminder_id = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [data.title, data.group_name || null, data.member_count ?? null, data.performers || null,
        data.song_title || null, data.song_artist || null,
        data.choreographer || null, data.practice_time || null, data.reminder_style || null, reminderId,
        data.notes || null, now, id]
    );

    await SyncEngine.markPending(db, 'dances', id, 'UPDATE');
    return this.getDanceById(db, id) as Promise<Dance>;
  },

  async deleteDance(db: SQLiteDatabase, id: string): Promise<void> {
    const dance = await this.getDanceById(db, id);
    if (dance?.reminder_id) {
      await ReminderService.cancelReminder(db, dance.reminder_id);
    }
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(`UPDATE dances SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    await SyncEngine.markPending(db, 'dances', id, 'DELETE');
  },

  async reorder(db: SQLiteDatabase, weddingId: string, orderedIds: string[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(`UPDATE dances SET sort_order = ?, updated_at = ? WHERE id = ? AND wedding_id = ?`, [i, now, orderedIds[i], weddingId]);
    }
  },
};
