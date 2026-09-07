import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { SyncEngine } from './syncEngine';

export interface AppNotification {
  id: string;
  wedding_id: string;
  type: 'EVENT' | 'PAYMENT' | 'ROOM' | 'INVITATION' | 'RSVP' | 'CUSTOM' | 'SYNC';
  reference_id: string | null;
  title: string;
  body: string | null;
  is_read: 0 | 1;
  created_at?: number;
  updated_at?: number;
}

export const NotificationService = {
  /**
   * Fetch all notifications for the active wedding
   */
  async getNotifications(db: SQLite.SQLiteDatabase, weddingId: string): Promise<AppNotification[]> {
    return db.getAllAsync<AppNotification>(
      `SELECT * FROM notifications 
       WHERE wedding_id = ? AND deleted_at IS NULL 
       ORDER BY created_at DESC`,
      [weddingId]
    );
  },

  /**
   * Insert a new notification into the inbox.
   */
  async createNotification(
    db: SQLite.SQLiteDatabase,
    weddingId: string,
    type: AppNotification['type'],
    title: string,
    body: string | null = null,
    referenceId: string | null = null
  ) {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await db.runAsync(
      `INSERT INTO notifications (id, wedding_id, type, reference_id, title, body, is_read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, weddingId, type, referenceId, title, body, now, now]
    );
    
    await SyncEngine.markPending(db, 'notifications', id, 'CREATE');
    return id;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(db: SQLite.SQLiteDatabase, id: string) {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ?`,
      [now, id]
    );
    await SyncEngine.markPending(db, 'notifications', id, 'UPDATE');
  },

  /**
   * Mark all notifications as read for a given wedding
   */
  async markAllAsRead(db: SQLite.SQLiteDatabase, weddingId: string) {
    const now = Math.floor(Date.now() / 1000);
    
    // First, find all unread IDs so we can mark them in sync_queue
    const unreadIds = await db.getAllAsync<{id: string}>(
      `SELECT id FROM notifications WHERE wedding_id = ? AND is_read = 0 AND deleted_at IS NULL`,
      [weddingId]
    );
    
    if (unreadIds.length === 0) return;
    
    await db.runAsync(
      `UPDATE notifications SET is_read = 1, updated_at = ? WHERE wedding_id = ? AND is_read = 0 AND deleted_at IS NULL`,
      [now, weddingId]
    );
    
    // Mark them all for sync
    for (const record of unreadIds) {
      await SyncEngine.markPending(db, 'notifications', record.id, 'UPDATE');
    }
  },

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(db: SQLite.SQLiteDatabase, weddingId: string): Promise<number> {
    const result = await db.getFirstAsync<{count: number}>(
      `SELECT COUNT(*) as count FROM notifications WHERE wedding_id = ? AND is_read = 0 AND deleted_at IS NULL`,
      [weddingId]
    );
    return result ? result.count : 0;
  }
};
