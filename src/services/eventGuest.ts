import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Guest, EventGuest, Event } from '../database/types';

export const EventGuestService = {
  /**
   * Assigns a single guest to an event.
   */
  async addGuest(db: SQLite.SQLiteDatabase, weddingId: string, eventId: string, guestId: string): Promise<void> {
    const id = Crypto.randomUUID();
    try {
      await db.runAsync(
        `INSERT INTO event_guests (id, wedding_id, event_id, guest_id) VALUES (?, ?, ?, ?)`,
        [id, weddingId, eventId, guestId]
      );
    } catch (e: any) {
      if (!e.message.includes('UNIQUE')) {
        throw e;
      }
    }
  },

  /**
   * Bulk assigns multiple guests to an event.
   */
  async bulkAddGuests(db: SQLite.SQLiteDatabase, weddingId: string, eventId: string, guestIds: string[]): Promise<void> {
    for (const guestId of guestIds) {
      const id = Crypto.randomUUID();
      try {
        await db.runAsync(
          `INSERT INTO event_guests (id, wedding_id, event_id, guest_id) VALUES (?, ?, ?, ?)`,
          [id, weddingId, eventId, guestId]
        );
      } catch (e: any) {
        if (!e.message.includes('UNIQUE')) {
          console.error(e instanceof Error ? e.message : String(e));
        }
      }
    }
  },

  /**
   * Removes a single guest from an event.
   */
  async removeGuest(db: SQLite.SQLiteDatabase, eventId: string, guestId: string): Promise<void> {
    await db.runAsync(
      `DELETE FROM event_guests WHERE event_id = ? AND guest_id = ?`,
      [eventId, guestId]
    );
  },

  /**
   * Bulk removes guests from an event.
   */
  async bulkRemoveGuests(db: SQLite.SQLiteDatabase, eventId: string, guestIds: string[]): Promise<void> {
    if (guestIds.length === 0) return;
    const placeholders = guestIds.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM event_guests WHERE event_id = ? AND guest_id IN (${placeholders})`,
      [eventId, ...guestIds]
    );
  },

  /**
   * Retrieves all guests participating in a specific event.
   * Joins with the guests table to return full guest details plus event_guests ID and rsvp.
   */
  async getGuestsForEvent(db: SQLite.SQLiteDatabase, eventId: string): Promise<(Guest & { participation_id: string, event_rsvp_status: string })[]> {
    return await db.getAllAsync<Guest & { participation_id: string, event_rsvp_status: string }>(
      `SELECT g.*, eg.id as participation_id, eg.rsvp_status as event_rsvp_status 
       FROM event_guests eg
       JOIN guests g ON eg.guest_id = g.id
       WHERE eg.event_id = ?
       ORDER BY g.full_name ASC`,
      [eventId]
    );
  },

  /**
   * Retrieves all events a specific guest is participating in.
   * Joins with the events table to return full event details.
   */
  async getEventsForGuest(db: SQLite.SQLiteDatabase, guestId: string): Promise<(Event & { participation_id: string, event_rsvp_status: string })[]> {
    return await db.getAllAsync<Event & { participation_id: string, event_rsvp_status: string }>(
      `SELECT e.*, eg.id as participation_id, eg.rsvp_status as event_rsvp_status 
       FROM event_guests eg
       JOIN events e ON eg.event_id = e.id
       WHERE eg.guest_id = ?
       ORDER BY e.date ASC, e.start_time ASC`,
      [guestId]
    );
  },

  /**
   * Update the RSVP status or notes for a specific participation record.
   */
  async updateParticipation(db: SQLite.SQLiteDatabase, participationId: string, rsvpStatus: string, notes?: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    if (notes !== undefined) {
      await db.runAsync(
        `UPDATE event_guests SET rsvp_status = ?, notes = ?, updated_at = ? WHERE id = ?`,
        [rsvpStatus, notes, now, participationId]
      );
    } else {
      await db.runAsync(
        `UPDATE event_guests SET rsvp_status = ?, updated_at = ? WHERE id = ?`,
        [rsvpStatus, now, participationId]
      );
    }
  }
};
