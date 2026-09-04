import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';
import { AuthService } from '../services/auth';
import { getUserWedding } from '../services/wedding';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error' | 'not_connected';

interface SyncContextProps {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  pendingCount: number;
  isOnline: boolean;
  manualSync: () => Promise<void>;
  manualBackup: () => Promise<void>;
}

const SyncContext = createContext<SyncContextProps>({
  status: 'not_connected',
  lastSyncedAt: null,
  pendingCount: 0,
  isOnline: true,
  manualSync: async () => {},
  manualBackup: async () => {},
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<SyncStatus>('not_connected');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Listen to network state
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected;
      setIsOnline(connected);
      if (!connected) {
        setStatus('offline');
      }
    });

    return () => unsubscribe();
  }, []);

  // Load last backup timestamp from preferences
  useEffect(() => {
    const loadSyncState = async () => {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding) return;

        // Check for last backup timestamp in user_preferences
        try {
          const result = await db.getFirstAsync<{ value: string }>(
            `SELECT value FROM user_preferences WHERE wedding_id = ? AND key = 'last_backup_time'`,
            [wedding.id]
          );
          if (result?.value) {
            setLastSyncedAt(new Date(parseInt(result.value)));
          }
        } catch {
          // Table might not exist yet
        }
      } catch {
        // Ignore
      }
    };
    loadSyncState();
  }, [db]);

  const manualSync = async () => {
    // For now, sync is manual backup/restore via Google Drive.
    // This will be enhanced when Google Drive OAuth is configured.
    setStatus('not_connected');
  };

  const manualBackup = async () => {
    try {
      setStatus('syncing');
      const session = await AuthService.getCurrentSession(db);
      if (!session) {
        setStatus('error');
        return;
      }
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) {
        setStatus('error');
        return;
      }

      const { BackupService } = await import('../services/backupService');
      const { GoogleDriveService } = await import('../services/googleDriveService');
      
      const backup = await BackupService.createBackup(db, wedding.id);
      
      // Upload to Drive
      await GoogleDriveService.uploadBackup(wedding.id, backup);
      
      // Also export locally
      const success = await BackupService.exportBackup(backup);

      if (success) {
        const now = Date.now();
        setLastSyncedAt(new Date(now));
        setStatus('synced');
        
        // Save backup timestamp
        try {
          const { SettingsService } = await import('../services/settings');
          await SettingsService.setPreference(db, wedding.id, 'last_backup_time', String(now));
        } catch {
          // Ignore
        }
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Backup error:', error instanceof Error ? error.message : String(error));
      setStatus('error');
    }
  };

  return (
    <SyncContext.Provider value={{ status, lastSyncedAt, pendingCount, isOnline, manualSync, manualBackup }}>
      {children}
    </SyncContext.Provider>
  );
};
