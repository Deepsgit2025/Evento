import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { BackupData } from './backupService';

// Real Google Drive sync (see googleAuth.ts) is used automatically once an
// OAuth client ID is configured; the methods below (`uploadBackupToDrive`
// etc.) call the real Drive REST API with an access token. Until then, the
// email-keyed methods below fall back to local mock storage so the rest of
// the app still has something to sync against.

const DRIVE_MOCK_DIR = FileSystem.documentDirectory + 'GoogleDriveMock/';
const BACKUP_FILENAME = 'evento_backup.json';

async function driveFetch(url: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google Drive API error ${res.status}: ${body}`);
  }
  return res;
}

async function findDriveFileId(accessToken: string, filename: string): Promise<string | null> {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(`name='${filename}' and trashed=false`)}&fields=files(id,name)`;
  const res = await driveFetch(url, accessToken);
  const json = await res.json();
  return json.files?.[0]?.id || null;
}

export const GoogleDriveService = {
  /**
   * Uploads the backup to the real Google Drive (via `drive.file` scope) of
   * the signed-in account, creating or updating a single app-owned file.
   */
  async uploadBackupToDrive(accessToken: string, data: BackupData): Promise<boolean> {
    try {
      const content = JSON.stringify(data);
      const existingId = await findDriveFileId(accessToken, BACKUP_FILENAME);

      if (existingId) {
        await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, accessToken, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: content,
        });
      } else {
        const boundary = `evento_${Date.now()}`;
        const metadata = { name: BACKUP_FILENAME, mimeType: 'application/json' };
        const body =
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n` +
          `--${boundary}--`;

        await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', accessToken, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        });
      }
      return true;
    } catch (e) {
      console.error('Real Drive upload failed', e instanceof Error ? e.message : String(e));
      return false;
    }
  },

  /**
   * Downloads the backup file from the real Google Drive account, if one exists.
   */
  async downloadBackupFromDrive(accessToken: string): Promise<BackupData | null> {
    try {
      const fileId = await findDriveFileId(accessToken, BACKUP_FILENAME);
      if (!fileId) return null;
      const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, accessToken);
      const text = await res.text();
      return JSON.parse(text) as BackupData;
    } catch (e) {
      console.error('Real Drive download failed', e instanceof Error ? e.message : String(e));
      return null;
    }
  },
  async init() {
    const dirInfo = await FileSystem.getInfoAsync(DRIVE_MOCK_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DRIVE_MOCK_DIR, { intermediates: true });
    }
  },

  async uploadBackup(weddingId: string, data: BackupData): Promise<boolean> {
    try {
      await this.init();
      const filename = `evento_backup_${weddingId}_${Date.now()}.json`;
      const path = DRIVE_MOCK_DIR + filename;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
      
      // Also update latest pointer
      await FileSystem.writeAsStringAsync(DRIVE_MOCK_DIR + `evento_latest_${weddingId}.json`, JSON.stringify(data));
      
      return true;
    } catch (e) {
      console.error('Drive upload failed', e);
      return false;
    }
  },

  async downloadLatestBackup(weddingId: string): Promise<BackupData | null> {
    try {
      await this.init();
      const path = DRIVE_MOCK_DIR + `evento_latest_${weddingId}.json`;
      const info = await FileSystem.getInfoAsync(path);
      
      if (!info.exists) return null;
      
      const content = await FileSystem.readAsStringAsync(path);
      return JSON.parse(content) as BackupData;
    } catch (e) {
      console.error('Drive download failed', e);
      return null;
    }
  },

  async uploadBackupByEmail(email: string, data: BackupData): Promise<boolean> {
    try {
      await this.init();
      const filename = `evento_sync_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      const path = DRIVE_MOCK_DIR + filename;
      
      // We will pretend this is uploading to Google Drive
      await new Promise(resolve => setTimeout(resolve, 2000));
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Drive email upload failed', e);
      return false;
    }
  },

  async downloadBackupByEmail(email: string): Promise<BackupData | null> {
    try {
      await this.init();
      const filename = `evento_sync_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      const path = DRIVE_MOCK_DIR + filename;
      
      // Simulate scanning Google Drive
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;
      
      const content = await FileSystem.readAsStringAsync(path);
      return JSON.parse(content) as BackupData;
    } catch (e) {
      console.error('Drive email download failed', e);
      return null;
    }
  },

  async hasDriveAccess(): Promise<boolean> {
    // Mocking that user has logged in
    return true; 
  }
};
