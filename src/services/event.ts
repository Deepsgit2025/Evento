import * as SQLite from 'expo-sqlite';
import * as crypto from 'expo-crypto';
import { Event } from '../database/types';
import { SyncEngine } from './syncEngine';
import { ReminderService } from './reminder';

export class EventService {
  static readonly PREDEFINED_TYPES = [
    'Haldi',
    'Mehndi',
    'Sangeet',
    'Baraat',
    'Wedding',
    'Reception',
    'Dinner',
    'Other'
  ];

  static async getEvents(db: SQLite.SQLiteDatabase, weddingId: string): Promise<Event[]> {
    return db.getAllAsync<Event>(
      `SELECT * FROM events 
       WHERE wedding_id = ? 
       ORDER BY date ASC, start_time ASC`,
      [weddingId]
    );
  }

  static async getEventById(db: SQLite.SQLiteDatabase, id: string): Promise<Event | null> {
    return db.getFirstAsync<Event>(
      `SELECT * FROM events WHERE id = ?`,
      [id]
    );
  }

  static async createEvent(
    db: SQLite.SQLiteDatabase,
    weddingId: string,
    eventData: Omit<Event, 'id' | 'wedding_id' | 'created_at' | 'updated_at'>
  ): Promise<Event> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Validate end_time is not before start_time on same day
    if (eventData.start_time && eventData.end_time && eventData.date) {
      if (eventData.end_time < eventData.start_time) {
        throw new Error('End time cannot be before start time on the same day.');
      }
    }

    await db.runAsync(
      `INSERT INTO events (id, wedding_id, name, event_type, date, start_time, end_time, location, description, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        weddingId,
        eventData.name,
        eventData.event_type || null,
        eventData.date || null,
        eventData.start_time || null,
        eventData.end_time || null,
        eventData.location || null,
        eventData.description || null,
        now,
        now
      ]
    );

    return {
      id,
      wedding_id: weddingId,
      ...eventData,
      created_at: now,
      updated_at: now
    };
  }

  static async updateEvent(
    db: SQLite.SQLiteDatabase,
    id: string,
    eventData: Partial<Omit<Event, 'id' | 'wedding_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // Fetch existing event to perform combined validation
    const existing = await this.getEventById(db, id);
    if (!existing) throw new Error('Event not found');

    const updatedDate = eventData.date !== undefined ? eventData.date : existing.date;
    const updatedStart = eventData.start_time !== undefined ? eventData.start_time : existing.start_time;
    const updatedEnd = eventData.end_time !== undefined ? eventData.end_time : existing.end_time;

    if (updatedStart && updatedEnd && updatedDate) {
      if (updatedEnd < updatedStart) {
        throw new Error('End time cannot be before start time on the same day.');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(eventData).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      values.push(value);
    });

    updates.push(`updated_at = ?`);
    values.push(now);

    values.push(id);

    await db.runAsync(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async deleteEvent(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );
    await SyncEngine.markPending(db, 'events', id, 'DELETE');
    
    // EDGE CASE: Cancel OS notifications for this event
    const reminders = await db.getAllAsync<{id: string}>(
      `SELECT id FROM reminders WHERE reference_id = ? AND status = 'SCHEDULED' AND deleted_at IS NULL`,
      [id]
    );
    for (const r of reminders) {
      await ReminderService.cancelReminder(db, r.id);
    }
  }
}
