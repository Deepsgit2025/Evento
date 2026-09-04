import * as SQLite from 'expo-sqlite';
import { BackupService, BackupData } from './backupService';

/**
 * SyncEngine — Google Drive backup/restore architecture.
 * 
 * Architecture:
 * SQLite → Versioned backup JSON → Google Drive App Data → Other device → SQLite restore
 * 
 * The actual Google Drive upload/download requires OAuth setup.
 * This engine handles the local side: creating backup packages, 
 * restoring from packages, and tracking sync metadata.
 */
export const SyncEngine = {
  
  /**
   * Create a full backup package for sync
   */
  async createBackupPackage(db: SQLite.SQLiteDatabase, weddingId: string): Promise<BackupData> {
    return BackupService.createBackup(db, weddingId);
  },

  /**
   * Restore from a backup package with conflict resolution
   */
  async restoreFromBackup(db: SQLite.SQLiteDatabase, backup: BackupData): Promise<boolean> {
    return BackupService.restoreBackup(db, backup);
  },

  /**
   * Helper to mark a record as pending sync after an insert or update.
   * Used throughout the app to track changes that need backup.
   */
  async markPending(db: SQLite.SQLiteDatabase, tableName: string, id: string, operation: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE') {
    const now = Math.floor(Date.now() / 1000);
    try {
      await db.runAsync(
        `UPDATE ${tableName} SET updated_at = ? WHERE id = ?`,
        [now, id]
      );
    } catch (e) {
      // Table might not have updated_at
    }
  },

  /**
   * Get count of records modified since last backup
   */
  async getPendingChangesCount(db: SQLite.SQLiteDatabase, weddingId: string, lastBackupTime: number): Promise<number> {
    let totalPending = 0;
    
    const tables = [
      { name: 'guests', hasWeddingId: true },
      { name: 'events', hasWeddingId: true },
      { name: 'vendors', hasWeddingId: true },
      { name: 'payments', hasWeddingId: true },
      { name: 'expenses', hasWeddingId: true },
    ];

    for (const table of tables) {
      try {
        const result = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${table.name} WHERE wedding_id = ? AND updated_at > ?`,
          [weddingId, lastBackupTime]
        );
        totalPending += result?.count || 0;
      } catch {
        // Table might not exist
      }
    }

    return totalPending;
  },
};
