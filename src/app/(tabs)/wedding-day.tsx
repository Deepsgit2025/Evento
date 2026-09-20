import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { WeddingDayService, WeddingDaySnapshot } from '../../services/weddingDay';

export default function WeddingDayModeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();

  const [snapshot, setSnapshot] = useState<WeddingDaySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      const snap = await WeddingDayService.getSnapshot(db, wedding.id);
      setSnapshot(snap);
    } catch (e) {
      console.error('Failed to load wedding day mode', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (isLoading && !snapshot) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const alertCount =
    (snapshot?.delayedOrProblemEvents.length || 0) +
    (snapshot?.delayedVendors.length || 0) +
    (snapshot?.urgentTasks.length || 0) +
    (snapshot?.activeAnnouncements.length || 0);

  const call = (phone?: string | null) => { if (phone) Linking.openURL(`tel:${phone}`).catch(() => {}); };

  const quickActions = [
    { icon: 'call' as const, label: 'Call Manager', onPress: () => call(snapshot?.currentEvent?.responsible_phone) },
    { icon: 'megaphone' as const, label: 'Add Announcement', onPress: () => router.push('/(tabs)/announcements/add') },
    { icon: 'tv' as const, label: 'Update Event', onPress: () => router.push('/(tabs)/control-room') },
    { icon: 'people' as const, label: 'Check Guest', onPress: () => router.push('/(tabs)/guests') },
    { icon: 'car' as const, label: 'Baraat Status', onPress: () => router.push('/(tabs)/baraat') },
    { icon: 'alert-circle' as const, label: 'Emergency', onPress: () => router.push('/(tabs)/emergency') },
  ];

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Wedding Day Mode</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Everything that matters, right now</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* CURRENT */}
        <Card style={[styles.bigCard, { backgroundColor: theme.colors.primary }]}>
          <Typography variant="caption" weight="bold" color="rgba(255,255,255,0.8)">CURRENT</Typography>
          {snapshot?.currentEvent ? (
            <>
              <Typography variant="display" weight="heavy" color="#FFFFFF" style={{ marginTop: 4 }}>
                {snapshot.currentEvent.name}
              </Typography>
              <View style={styles.bigMetaRow}>
                {snapshot.currentEvent.location && (
                  <Typography variant="body" color="rgba(255,255,255,0.9)">{snapshot.currentEvent.location}</Typography>
                )}
                {snapshot.currentEvent.responsible_person && (
                  <Typography variant="body" color="rgba(255,255,255,0.9)">• {snapshot.currentEvent.responsible_person}</Typography>
                )}
              </View>
            </>
          ) : (
            <Typography variant="cardTitle" color="#FFFFFF" style={{ marginTop: 4 }}>No function running right now</Typography>
          )}
        </Card>

        {/* NEXT */}
        <Card style={styles.card}>
          <Typography variant="caption" weight="bold" color={theme.colors.textMuted}>NEXT</Typography>
          {snapshot?.nextEvent ? (
            <>
              <Typography variant="cardTitle" style={{ marginTop: 4 }}>{snapshot.nextEvent.name}</Typography>
              <View style={styles.bigMetaRow}>
                {snapshot.nextEventCountdown && (
                  <Typography variant="body" weight="semibold" color={theme.colors.primary}>{snapshot.nextEventCountdown}</Typography>
                )}
                {snapshot.nextEvent.location && (
                  <Typography variant="bodySecondary" color={theme.colors.textSecondary}>• {snapshot.nextEvent.location}</Typography>
                )}
              </View>
            </>
          ) : (
            <Typography variant="body" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>No more functions scheduled today</Typography>
          )}
        </Card>

        {/* ALERTS */}
        <Typography variant="sectionTitle" weight="heavy" style={styles.sectionTitle}>
          Alerts {alertCount > 0 ? `(${alertCount})` : ''}
        </Typography>
        {alertCount === 0 ? (
          <Card style={styles.card}>
            <View style={styles.okRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Typography variant="body" color={theme.colors.textSecondary}>Nothing needs attention</Typography>
            </View>
          </Card>
        ) : (
          <>
            {snapshot?.delayedOrProblemEvents.map(e => (
              <Pressable key={e.id} onPress={() => router.push('/(tabs)/control-room')}>
                <Card style={[styles.card, styles.alertCard]}>
                  <Ionicons name="warning" size={20} color={theme.colors.error} />
                  <Typography variant="body" weight="semibold" style={{ flex: 1, marginLeft: 12 }}>
                    {e.name} is {e.status === 'PROBLEM' ? 'having a problem' : 'delayed'}
                  </Typography>
                </Card>
              </Pressable>
            ))}
            {snapshot?.delayedVendors.map(v => (
              <Pressable key={v.assignment_id} onPress={() => router.push('/(tabs)/vendors/arrivals')}>
                <Card style={[styles.card, styles.alertCard]}>
                  <Ionicons name="briefcase" size={20} color={theme.colors.warning} />
                  <Typography variant="body" weight="semibold" style={{ flex: 1, marginLeft: 12 }}>
                    {v.vendor_name} is delayed for {v.event_name}
                  </Typography>
                </Card>
              </Pressable>
            ))}
            {snapshot?.activeAnnouncements.filter(a => a.priority === 'URGENT' || a.priority === 'HIGH').map(a => (
              <Card key={a.id} style={[styles.card, styles.alertCard]}>
                <Ionicons name="megaphone" size={20} color={theme.colors.primary} />
                <Typography variant="body" weight="semibold" style={{ flex: 1, marginLeft: 12 }}>{a.title}</Typography>
              </Card>
            ))}
            {snapshot?.urgentTasks.slice(0, 3).map(t => (
              <Pressable key={t.id} onPress={() => router.push('/(tabs)/tasks')}>
                <Card style={[styles.card, styles.alertCard]}>
                  <Ionicons name="checkbox" size={20} color={theme.colors.textSecondary} />
                  <Typography variant="body" weight="semibold" style={{ flex: 1, marginLeft: 12 }}>{t.title} is due</Typography>
                </Card>
              </Pressable>
            ))}
          </>
        )}

        {/* QUICK ACTIONS */}
        <Typography variant="sectionTitle" weight="heavy" style={styles.sectionTitle}>Quick Actions</Typography>
        <View style={styles.actionsGrid}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [
                styles.actionTile,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
                pressed && { opacity: 0.8 },
              ]}
              onPress={a.onPress}
            >
              <Ionicons name={a.icon} size={28} color={theme.colors.primary} />
              <Typography variant="caption" weight="semibold" style={{ textAlign: 'center', marginTop: 8 }}>{a.label}</Typography>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  bigCard: { padding: 24, marginBottom: 16 },
  card: { padding: 16, marginBottom: 12 },
  bigMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  sectionTitle: { marginTop: 8, marginBottom: 12 },
  okRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertCard: { flexDirection: 'row', alignItems: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionTile: {
    width: '30%', minWidth: 100, aspectRatio: 1, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
});
