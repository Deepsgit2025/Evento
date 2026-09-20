import { SQLiteDatabase } from 'expo-sqlite';
import { Event, Announcement, Task } from '../database/types';
import { EventService } from './event';
import { AnnouncementService } from './announcement';
import { VendorEventService, VendorArrivalRow } from './vendorEvent';
import { getEventCountdown } from '../utils/date';

export interface WeddingDaySnapshot {
  currentEvent: Event | null;
  nextEvent: Event | null;
  nextEventCountdown: string | null;
  delayedOrProblemEvents: Event[];
  delayedVendors: VendorArrivalRow[];
  activeAnnouncements: Announcement[];
  urgentTasks: Task[];
}

/**
 * Aggregates the "what's happening right now" data shared by the Wedding
 * Control Room (full management view) and Wedding Day Mode (simplified,
 * high-contrast view for use during the actual wedding).
 */
export const WeddingDayService = {
  async getSnapshot(db: SQLiteDatabase, weddingId: string): Promise<WeddingDaySnapshot> {
    const [events, activeAnnouncements, arrivals, urgentTasks] = await Promise.all([
      EventService.getEvents(db, weddingId),
      AnnouncementService.getActiveAnnouncements(db, weddingId),
      VendorEventService.getArrivalsForWedding(db, weddingId),
      this.getUrgentTasks(db, weddingId),
    ]);

    let currentEvent: Event | null = null;
    let nextEvent: Event | null = null;
    let nextEventCountdown: string | null = null;

    for (const event of events) {
      const countdown = getEventCountdown(event.date, event.start_time, event.end_time);
      if (!countdown) continue;
      if (countdown.isNow && !currentEvent) {
        currentEvent = event;
      } else if (!countdown.isPast && !countdown.isNow && !nextEvent) {
        nextEvent = event;
        nextEventCountdown = countdown.label;
      }
    }

    const delayedOrProblemEvents = events.filter(e => e.status === 'DELAYED' || e.status === 'PROBLEM');
    const delayedVendors = arrivals.filter(a => a.status === 'DELAYED');

    return { currentEvent, nextEvent, nextEventCountdown, delayedOrProblemEvents, delayedVendors, activeAnnouncements, urgentTasks };
  },

  async getUrgentTasks(db: SQLiteDatabase, weddingId: string): Promise<Task[]> {
    const todayStr = new Date().toISOString().slice(0, 10);
    return db.getAllAsync<Task>(
      `SELECT * FROM tasks WHERE wedding_id = ? AND status != 'DONE' AND due_date IS NOT NULL AND due_date <= ? ORDER BY due_date ASC LIMIT 10`,
      [weddingId, todayStr]
    );
  },
};
