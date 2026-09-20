import { SQLiteDatabase } from 'expo-sqlite';
import { EventService } from './event';

export interface ReadinessCategory {
  label: string;
  /** 0-100, or null when there's no data yet to compute a meaningful percentage. */
  percent: number | null;
  route: string;
}

/**
 * Wedding Readiness: a single glanceable "how ready are we" summary, built
 * entirely from real rows already in the database — never fabricated.
 * Each category is null (not 0%) when its denominator is empty, so a brand
 * new wedding shows "no data yet" instead of a misleading 0%.
 */
export const ReadinessService = {
  async getReadiness(db: SQLiteDatabase, weddingId: string): Promise<ReadinessCategory[]> {
    const [guests, rooms, events, vendors, tasks, invitations] = await Promise.all([
      this.guestsReadiness(db, weddingId),
      this.roomsReadiness(db, weddingId),
      this.eventsReadiness(db, weddingId),
      this.vendorsReadiness(db, weddingId),
      this.tasksReadiness(db, weddingId),
      this.invitationsReadiness(db, weddingId),
    ]);

    return [
      { label: 'Guests', percent: guests, route: '/(tabs)/guests' },
      { label: 'Rooms', percent: rooms, route: '/(tabs)/rooms' },
      { label: 'Events', percent: events, route: '/(tabs)/events' },
      { label: 'Vendors', percent: vendors, route: '/(tabs)/vendors' },
      { label: 'Tasks', percent: tasks, route: '/(tabs)/tasks' },
      { label: 'Invitations', percent: invitations, route: '/(tabs)/patrika' },
    ];
  },

  // % of added guests who have responded to their RSVP (not left PENDING).
  async guestsReadiness(db: SQLiteDatabase, weddingId: string): Promise<number | null> {
    const row = await db.getFirstAsync<{ total: number; responded: number }>(
      `SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN rsvp_status != 'PENDING' THEN 1 ELSE 0 END), 0) as responded
       FROM guests WHERE wedding_id = ?`,
      [weddingId]
    );
    if (!row || row.total === 0) return null;
    return Math.round((row.responded / row.total) * 100);
  },

  // % of guests who have a room assignment.
  async roomsReadiness(db: SQLiteDatabase, weddingId: string): Promise<number | null> {
    const row = await db.getFirstAsync<{ total: number; assigned: number }>(
      `SELECT
         COUNT(*) as total,
         COALESCE(SUM(CASE WHEN id IN (SELECT guest_id FROM room_assignments) THEN 1 ELSE 0 END), 0) as assigned
       FROM guests WHERE wedding_id = ?`,
      [weddingId]
    );
    if (!row || row.total === 0) return null;
    return Math.round((row.assigned / row.total) * 100);
  },

  // % of the standard wedding function types (Haldi, Mehndi, Sangeet, ...) that have at least one event scheduled.
  async eventsReadiness(db: SQLiteDatabase, weddingId: string): Promise<number | null> {
    const rows = await db.getAllAsync<{ event_type: string | null }>(
      `SELECT DISTINCT event_type FROM events WHERE wedding_id = ? AND event_type IS NOT NULL`,
      [weddingId]
    );
    const eventCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM events WHERE wedding_id = ?`,
      [weddingId]
    );
    if (!eventCount || eventCount.count === 0) return null;
    const covered = new Set(rows.map(r => r.event_type));
    const planned = EventService.PREDEFINED_TYPES.filter(t => t !== 'Other').filter(t => covered.has(t)).length;
    const total = EventService.PREDEFINED_TYPES.filter(t => t !== 'Other').length;
    return Math.round((planned / total) * 100);
  },

  // % of vendors that are fully paid off.
  async vendorsReadiness(db: SQLiteDatabase, weddingId: string): Promise<number | null> {
    const row = await db.getFirstAsync<{ total: number; paid: number }>(
      `SELECT COUNT(*) as total,
         COALESCE(SUM(CASE WHEN v.agreed_amount <= COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.vendor_id = v.id), 0) THEN 1 ELSE 0 END), 0) as paid
       FROM vendors v WHERE v.wedding_id = ? AND v.deleted_at IS NULL`,
      [weddingId]
    );
    if (!row || row.total === 0) return null;
    return Math.round((row.paid / row.total) * 100);
  },

  // % of tasks marked DONE.
  async tasksReadiness(db: SQLiteDatabase, weddingId: string): Promise<number | null> {
    const row = await db.getFirstAsync<{ total: number; done: number }>(
      `SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END), 0) as done
       FROM tasks WHERE wedding_id = ?`,
      [weddingId]
    );
    if (!row || row.total === 0) return null;
    return Math.round((row.done / row.total) * 100);
  },

  // % of guests who have at least one invitation recipient record that isn't still NOT_SENT.
  async invitationsReadiness(db: SQLiteDatabase, weddingId: string): Promise<number | null> {
    const totalGuests = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM guests WHERE wedding_id = ?`,
      [weddingId]
    );
    if (!totalGuests || totalGuests.count === 0) return null;
    const sent = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT ir.guest_id) as count
       FROM invitation_recipients ir
       JOIN invitations i ON ir.invitation_id = i.id
       WHERE i.wedding_id = ? AND ir.status != 'NOT_SENT'`,
      [weddingId]
    );
    return Math.round(((sent?.count || 0) / totalGuests.count) * 100);
  },
};
