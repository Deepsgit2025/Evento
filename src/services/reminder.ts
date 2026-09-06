import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SyncEngine } from './syncEngine';
import { SettingsService, NotificationPrefKey } from './settings';

const ALARM_CHANNEL_ID = 'task-alarms';

export interface Reminder {
  id: string;
  wedding_id: string;
  type: 'EVENT' | 'PAYMENT' | 'ROOM' | 'INVITATION' | 'RSVP' | 'CUSTOM' | 'TASK' | 'DANCE';
  reference_id: string | null;
  title: string;
  notes: string | null;
  reminder_time: number;
  status: 'SCHEDULED' | 'DELIVERED' | 'CANCELLED';
  notification_id: string | null;
  created_at?: number;
  updated_at?: number;
}

// Ensure notifications show even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ReminderService = {
  /**
   * Request OS permissions for push notifications
   */
  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  },

  /**
   * Registers a high-importance Android channel (sound + strong vibration,
   * shown on lock screen) so "Alarm" style reminders feel more urgent than a
   * regular "Message" notification. No-op on iOS (handled via interruptionLevel).
   */
  async ensureAlarmChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Task & Dance Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  },

  /**
   * Schedule a new reminder locally and save it to SQLite.
   * `style` only affects TASK/DANCE reminders: 'ALARM' uses a louder, more
   * urgent notification channel/priority than the default 'MESSAGE' style.
   */
  async createReminder(
    db: SQLite.SQLiteDatabase,
    reminderData: Omit<Reminder, 'id' | 'status' | 'notification_id' | 'created_at' | 'updated_at'>,
    style?: 'ALARM' | 'MESSAGE'
  ): Promise<string | null> {
    const id = Crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Determine the pref key
    let prefKey: NotificationPrefKey = 'pref_notify_general';
    switch (reminderData.type) {
      case 'EVENT': prefKey = 'pref_notify_event'; break;
      case 'PAYMENT': prefKey = 'pref_notify_payment'; break;
      case 'INVITATION':
      case 'RSVP': prefKey = 'pref_notify_invitation'; break;
    }

    const isEnabled = await SettingsService.getBoolean(db, reminderData.wedding_id, prefKey);

    // Only schedule OS notification if time is in the future AND the user has this type enabled
    let notificationId = null;
    if (reminderData.reminder_time > now && isEnabled) {
      const hasPermission = await this.requestPermissions();
      if (hasPermission) {
        const isAlarm = style === 'ALARM';
        if (isAlarm) await this.ensureAlarmChannel();

        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: (isAlarm ? '⏰ ' : '') + reminderData.title,
            body: reminderData.notes || 'You have a new wedding reminder.',
            sound: true,
            ...(isAlarm ? { interruptionLevel: 'timeSensitive' as const } : {}),
            ...(isAlarm && Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : {}),
            data: {
              reminderId: id,
              weddingId: reminderData.wedding_id,
              type: reminderData.type,
              referenceId: reminderData.reference_id
            },
          },
          trigger: new Date(reminderData.reminder_time * 1000) as any,
        });
      }
    }

    const status = (reminderData.reminder_time <= now) ? 'DELIVERED' : 'SCHEDULED';

    await db.runAsync(
      `INSERT INTO reminders (
        id, wedding_id, type, reference_id, title, notes, reminder_time, status, notification_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        reminderData.wedding_id,
        reminderData.type,
        reminderData.reference_id,
        reminderData.title,
        reminderData.notes,
        reminderData.reminder_time,
        status,
        notificationId,
        now,
        now
      ]
    );

    await SyncEngine.markPending(db, 'reminders', id, 'CREATE');
    
    return id;
  },

  /**
   * Cancel an existing reminder.
   */
  async cancelReminder(db: SQLite.SQLiteDatabase, id: string) {
    const reminder = await db.getFirstAsync<Reminder>(`SELECT * FROM reminders WHERE id = ?`, [id]);
    
    if (reminder) {
      if (reminder.notification_id) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
      }
      
      const now = Math.floor(Date.now() / 1000);
      await db.runAsync(
        `UPDATE reminders SET status = 'CANCELLED', updated_at = ?, notification_id = NULL WHERE id = ?`,
        [now, id]
      );
      
      await SyncEngine.markPending(db, 'reminders', id, 'UPDATE');
    }
  },

  /**
   * Fetch all active reminders for a wedding.
   */
  async getReminders(db: SQLite.SQLiteDatabase, weddingId: string): Promise<Reminder[]> {
    return db.getAllAsync<Reminder>(
      `SELECT * FROM reminders WHERE wedding_id = ? AND deleted_at IS NULL ORDER BY reminder_time ASC`,
      [weddingId]
    );
  },
  
  /**
   * Handle incoming remote reminder sync (e.g. from another device).
   * Ensures this device also schedules an OS push notification for future reminders.
   */
  async processRemoteReminder(db: SQLite.SQLiteDatabase, remoteReminder: Reminder) {
    const now = Math.floor(Date.now() / 1000);
    
    // Determine the pref key
    let prefKey: NotificationPrefKey = 'pref_notify_general';
    switch (remoteReminder.type) {
      case 'EVENT': prefKey = 'pref_notify_event'; break;
      case 'PAYMENT': prefKey = 'pref_notify_payment'; break;
      case 'INVITATION':
      case 'RSVP': prefKey = 'pref_notify_invitation'; break;
    }
    const isEnabled = await SettingsService.getBoolean(db, remoteReminder.wedding_id, prefKey);
    
    // Check if we already have it scheduled
    const existing = await db.getFirstAsync<Reminder>(
      `SELECT * FROM reminders WHERE id = ?`, 
      [remoteReminder.id]
    );

    // If it's a new, future reminder that is 'SCHEDULED' and enabled, we schedule it locally on this device.
    let newNotificationId = remoteReminder.notification_id; // Default to existing (even though it's useless on this OS)
    
    if (remoteReminder.status === 'SCHEDULED' && remoteReminder.reminder_time > now && isEnabled) {
      // If we didn't have it, or we had it but it wasn't scheduled on our OS
      if (!existing || !existing.notification_id) {
        const hasPermission = await this.requestPermissions();
        if (hasPermission) {
          newNotificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: remoteReminder.title,
              body: remoteReminder.notes || '',
              data: { 
                reminderId: remoteReminder.id, 
                weddingId: remoteReminder.wedding_id,
                type: remoteReminder.type,
                referenceId: remoteReminder.reference_id
              },
            },
            trigger: new Date(remoteReminder.reminder_time * 1000) as any,
          });
        }
      } else {
        // We already scheduled it, keep our local OS ID
        newNotificationId = existing.notification_id;
      }
    } else if (remoteReminder.status === 'CANCELLED' && existing && existing.notification_id) {
      // It was cancelled remotely, cancel our local OS notification
      await Notifications.cancelScheduledNotificationAsync(existing.notification_id);
      newNotificationId = null;
    }

    // Now update SQLite with the new state (which replaces whatever is there)
    // Note: We use SyncEngine's pull logic usually, but SyncEngine can call this hook.
    return newNotificationId;
  },

  /**
   * Run on app boot to ensure all SQLite SCHEDULED reminders have an OS equivalent.
   * Restores lost notifications (e.g. after Android device reboot or app reinstall).
   */
  async verifyScheduledNotifications(db: SQLite.SQLiteDatabase, weddingId: string) {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Get all active, future reminders for this wedding
      const localReminders = await db.getAllAsync<Reminder>(
        `SELECT * FROM reminders WHERE wedding_id = ? AND status = 'SCHEDULED' AND reminder_time > ? AND deleted_at IS NULL`,
        [weddingId, now]
      );
      
      if (localReminders.length === 0) return;

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;
      
      const scheduledOS = await Notifications.getAllScheduledNotificationsAsync();
      const scheduledOSIds = scheduledOS.map(n => n.identifier);
      
      for (const reminder of localReminders) {
        // Determine the pref key
        let prefKey: NotificationPrefKey = 'pref_notify_general';
        switch (reminder.type) {
          case 'EVENT': prefKey = 'pref_notify_event'; break;
          case 'PAYMENT': prefKey = 'pref_notify_payment'; break;
          case 'INVITATION':
          case 'RSVP': prefKey = 'pref_notify_invitation'; break;
        }
        
        const isEnabled = await SettingsService.getBoolean(db, weddingId, prefKey);
        
        if (isEnabled) {
          // If the DB has a notification_id but the OS doesn't recognize it, OR it has none at all
          if (!reminder.notification_id || !scheduledOSIds.includes(reminder.notification_id)) {
            // Re-schedule it
            const newId = await Notifications.scheduleNotificationAsync({
              content: {
                title: reminder.title,
                body: reminder.notes || undefined,
                data: { reminderId: reminder.id, type: reminder.type, referenceId: reminder.reference_id },
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(reminder.reminder_time * 1000)
              }
            });
            
            await db.runAsync(
              `UPDATE reminders SET notification_id = ? WHERE id = ?`,
              [newId, reminder.id]
            );
          }
        } else {
          // If it's disabled but the OS has it scheduled, cancel it
          if (reminder.notification_id && scheduledOSIds.includes(reminder.notification_id)) {
            await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
          }
        }
      }
    } catch (e) {
      console.error("Boot Verification failed:", e instanceof Error ? e.message : String(e));
    }
  }
};
