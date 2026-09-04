import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { SyncEngine } from './syncEngine';

export interface BackupData {
  version: number;
  created_at: number;
  wedding_id: string;
  data: Record<string, any[]>;
}

export const BackupService = {
  
  /**
   * Reads all data for a given wedding and constructs a JSON structure.
   */
  async createBackup(db: SQLite.SQLiteDatabase, weddingId: string): Promise<BackupData> {
    const backup: BackupData = {
      version: 1,
      created_at: Date.now(),
      wedding_id: weddingId,
      data: {}
    };

    // Define tables to backup. Order matters for constraints, though sqlite in expo is permissive.
    // It's good practice to backup in topological order or handle it on restore.
    const tables = [
      'weddings',
      'guest_groups',
      'guests',
      'hotels',
      'rooms',
      'room_assignments',
      'events',
      'event_guests',
      'vendors',
      'vendor_events',
      'payments',
      'expenses',
      'invitations',
      'invitation_recipients',
      'invitation_campaigns',
      'whatsapp_configs',
      'reminders'
    ];

    for (const table of tables) {
      // We backup only non-deleted records for this specific wedding, or all if it's the weddings table itself
      let query = `SELECT * FROM ${table} WHERE wedding_id = ? AND deleted_at IS NULL`;
      let params = [weddingId];
      
      if (table === 'weddings') {
        query = `SELECT * FROM ${table} WHERE id = ?`;
      } else if (table === 'room_assignments') {
        query = `SELECT ra.* FROM room_assignments ra 
                 JOIN guests g ON ra.guest_id = g.id 
                 WHERE g.wedding_id = ? AND ra.deleted_at IS NULL`;
      }

      const rows = await db.getAllAsync(query, params);
      backup.data[table] = rows;
    }

    return backup;
  },

  /**
   * Exports a BackupData object as a JSON file and opens the share sheet.
   */
  async exportBackup(backup: BackupData): Promise<boolean> {
    try {
      const jsonStr = JSON.stringify(backup, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Evento_Backup_${dateStr}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Wedding Backup'
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to export backup", e instanceof Error ? e.message : String(e));
      return false;
    }
  },

  /**
   * Pick a JSON file from the device
   */
  async pickBackupFile(): Promise<BackupData | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled) return null;

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8
      });

      const data = JSON.parse(fileContent);
      
      if (!this.validateBackup(data)) {
        throw new Error("Invalid backup format");
      }

      return data as BackupData;
    } catch (e) {
      console.error("Failed to pick or parse backup", e instanceof Error ? e.message : String(e));
      throw e;
    }
  },

  /**
   * Strictly validates the structure of the backup JSON.
   */
  validateBackup(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (data.version !== 1) return false;
    if (!data.wedding_id || typeof data.wedding_id !== 'string') return false;
    if (!data.created_at || typeof data.created_at !== 'number') return false;
    if (!data.data || typeof data.data !== 'object') return false;
    
    // Check if expected tables exist
    const requiredTables = ['weddings', 'guests', 'events', 'vendors'];
    for (const table of requiredTables) {
      if (!Array.isArray(data.data[table])) return false;
    }

    return true;
  },

  /**
   * Restores a backup. Uses Upsert strategy:
   * 1. Opens transaction.
   * 2. Upserts all records from backup into the DB.
   * 3. Marks them in SyncQueue as CREATE or UPDATE.
   */
  async restoreBackup(db: SQLite.SQLiteDatabase, backup: BackupData): Promise<boolean> {
    try {
      // Simple Upsert logic: For each table, if record exists by ID, update it, else insert it.
      // We will perform this manually table by table.
      
      const tablesToRestore = [
        'weddings',
        'guest_groups',
        'guests',
        'hotels',
        'rooms',
        'room_assignments',
        'events',
        'event_guests',
        'vendors',
        'vendor_events',
        'payments',
        'expenses',
        'invitations',
        'invitation_recipients',
        'invitation_campaigns',
        'whatsapp_configs',
        'reminders'
      ];

      await db.execAsync('BEGIN TRANSACTION;');

      for (const table of tablesToRestore) {
        const rows = backup.data[table];
        if (!rows || !Array.isArray(rows)) continue;

        for (const row of rows) {
          if (!row.id) continue;

          // Check if exists
          const existing = await db.getFirstAsync(`SELECT id FROM ${table} WHERE id = ?`, [row.id]);
          
          if (existing) {
            // Update
            const keys = Object.keys(row).filter(k => k !== 'id');
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => row[k]);
            
            await db.runAsync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, row.id]);
            await SyncEngine.markPending(db, table as any, row.id, 'UPDATE');
          } else {
            // Insert
            const keys = Object.keys(row);
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => row[k]);
            
            await db.runAsync(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
            await SyncEngine.markPending(db, table as any, row.id, 'CREATE');
          }
        }
      }

      await db.execAsync('COMMIT;');
      return true;

    } catch (e) {
      console.error("Failed to restore backup:", e instanceof Error ? e.message : String(e));
      await db.execAsync('ROLLBACK;');
      return false;
    }
  }

};
