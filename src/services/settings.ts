import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export type NotificationPrefKey =
  | 'pref_notify_event'
  | 'pref_notify_payment'
  | 'pref_notify_invitation'
  | 'pref_notify_sync'
  | 'pref_notify_general';

export const NOTIFICATION_PREF_KEYS: NotificationPrefKey[] = [
  'pref_notify_event',
  'pref_notify_payment',
  'pref_notify_invitation',
  'pref_notify_sync',
  'pref_notify_general',
];

export const SettingsService = {
  async getPreference(db: SQLiteDatabase, weddingId: string, key: string): Promise<string | null> {
    try {
      const result = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM user_preferences WHERE wedding_id = ? AND key = ?`,
        [weddingId, key]
      );
      return result?.value || null;
    } catch {
      return null;
    }
  },

  async setPreference(db: SQLiteDatabase, weddingId: string, key: string, value: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const existing = await this.getPreference(db, weddingId, key);
    
    if (existing !== null) {
      await db.runAsync(
        `UPDATE user_preferences SET value = ?, updated_at = ? WHERE wedding_id = ? AND key = ?`,
        [value, now, weddingId, key]
      );
    } else {
      await db.runAsync(
        `INSERT INTO user_preferences (id, wedding_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [Crypto.randomUUID(), weddingId, key, value, now, now]
      );
    }
  },

  async getAllPreferences(db: SQLiteDatabase, weddingId: string): Promise<Record<string, string>> {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM user_preferences WHERE wedding_id = ?`,
      [weddingId]
    );
    const prefs: Record<string, string> = {};
    for (const row of rows) {
      prefs[row.key] = row.value;
    }
    return prefs;
  },

  /** Reads a boolean preference. Unset preferences default to `true` (opt-out model). */
  async getBoolean(db: SQLiteDatabase, weddingId: string, key: string, defaultValue = true): Promise<boolean> {
    const raw = await this.getPreference(db, weddingId, key);
    if (raw === null) return defaultValue;
    return raw === '1' || raw === 'true';
  },

  async setBoolean(db: SQLiteDatabase, weddingId: string, key: string, value: boolean): Promise<void> {
    await this.setPreference(db, weddingId, key, value ? '1' : '0');
  },

  async getAllNotificationPrefs(db: SQLiteDatabase, weddingId: string): Promise<Record<NotificationPrefKey, boolean>> {
    const stored = await this.getAllPreferences(db, weddingId);
    const prefs = {} as Record<NotificationPrefKey, boolean>;
    for (const key of NOTIFICATION_PREF_KEYS) {
      const raw = stored[key];
      prefs[key] = raw === undefined ? true : raw === '1' || raw === 'true';
    }
    return prefs;
  }
};
