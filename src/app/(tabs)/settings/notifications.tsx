import React, { useState } from 'react';
import { View, StyleSheet, Switch, ScrollView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card, Button, IconButton } from '../../../components/ui';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { SettingsService, NotificationPrefKey } from '../../../services/settings';
import { ReminderService } from '../../../services/reminder';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    pref_notify_event: true,
    pref_notify_payment: true,
    pref_notify_invitation: true,
    pref_notify_sync: true,
    pref_notify_general: true
  });

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      async function fetchPrefs() {
        try {
          const session = await AuthService.getCurrentSession(db);
          if (session) {
            const wedding = await getUserWedding(db, session.id);
            if (wedding && isActive) {
              setWeddingId(wedding.id);
              const data = await SettingsService.getAllNotificationPrefs(db, wedding.id);
              setPrefs(data);
            }
          }
        } catch (e) {
          console.error(e instanceof Error ? e.message : String(e));
        }
      }
      fetchPrefs();
      return () => { isActive = false; };
    }, [db])
  );

  const toggleSwitch = async (key: NotificationPrefKey) => {
    if (!weddingId) return;
    
    const newValue = !prefs[key];
    // Optimistic update
    setPrefs(prev => ({ ...prev, [key]: newValue }));
    
    try {
      await SettingsService.setBoolean(db, weddingId, key, newValue);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      // Revert on failure
      setPrefs(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  const renderToggle = (key: NotificationPrefKey, title: string, description: string, icon: any, color: string) => (
    <View style={styles.toggleRow}>
      <View style={[styles.iconContainer, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.toggleText}>
        <Typography variant="body" weight="medium">{title}</Typography>
        <Typography variant="caption" color={theme.colors.textSecondary}>{description}</Typography>
      </View>
      <Switch
        trackColor={{ false: theme.colors.borderLight, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
        ios_backgroundColor={theme.colors.borderLight}
        onValueChange={() => toggleSwitch(key)}
        value={prefs[key]}
      />
    </View>
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <IconButton 
          icon={<Ionicons name="chevron-back" size={24} color={theme.colors.text} />}
          onPress={() => router.back()}
          style={styles.backBtn}
        />
        <Typography variant="sectionTitle">Notification Preferences</Typography>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Typography variant="body" color={theme.colors.textSecondary} style={styles.description}>
          Control which types of alerts you receive. These settings sync across all your devices.
        </Typography>

        {Platform.OS === 'android' && (
          <Card style={styles.fixCard}>
            <View style={styles.toggleRow}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '1A' }]}>
                <Ionicons name="alarm-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.toggleText}>
                <Typography variant="body" weight="medium">Alarms not ringing on time?</Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>
                  Android needs a separate "Alarms & reminders" permission for checklist and dance
                  alerts to ring exactly when scheduled, not just whenever the system gets to it.
                </Typography>
              </View>
            </View>
            <Button
              label="Open Alarm Settings"
              variant="outline"
              icon="settings-outline"
              onPress={() => ReminderService.openExactAlarmSettings()}
              style={{ marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg }}
            />
          </Card>
        )}

        <Card style={styles.card}>
          {renderToggle(
            'pref_notify_event',
            'Event Reminders',
            'Alerts before your events begin',
            'calendar-outline',
            theme.colors.primary
          )}
          <View style={styles.divider} />
          {renderToggle(
            'pref_notify_payment',
            'Payment Reminders',
            'Alerts for pending vendor payments',
            'card-outline',
            theme.colors.error
          )}
          <View style={styles.divider} />
          {renderToggle(
            'pref_notify_invitation',
            'Invitation Alerts',
            'Updates on WhatsApp sending status',
            'mail-outline',
            theme.colors.warning
          )}
          <View style={styles.divider} />
          {renderToggle(
            'pref_notify_sync',
            'Sync Issues',
            'Alerts when offline changes fail to sync',
            'sync-outline',
            theme.colors.textSecondary
          )}
          <View style={styles.divider} />
          {renderToggle(
            'pref_notify_general',
            'General Reminders',
            'Custom alerts you set manually',
            'notifications-outline',
            theme.colors.primary
          )}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  backBtn: {
    paddingHorizontal: 0,
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  description: {
    marginBottom: theme.spacing.xl,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  fixCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    borderColor: theme.colors.primary + '40',
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  toggleText: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 72, // Align with text
  },
});
