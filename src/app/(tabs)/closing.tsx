import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, Card, Button } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { ClosingService, ClosingChecklist } from '../../services/closing';

export default function PostWeddingClosingScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ClosingChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setChecklist(await ClosingService.getChecklist(db, wedding.id));
    } catch (e) {
      console.error('Failed to load closing checklist', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = checklist ? [
    { label: 'Pending vendor payments', count: checklist.pendingVendorPayments, ok: checklist.pendingVendorPayments === 0, icon: 'card-outline' as const, route: '/(tabs)/finance' },
    { label: 'Damaged or missing inventory', count: checklist.damagedOrMissingInventory, ok: checklist.damagedOrMissingInventory === 0, icon: 'cube-outline' as const, route: '/(tabs)/inventory' },
    { label: 'Rentals not yet returned', count: checklist.unreturnedInventory, ok: checklist.unreturnedInventory === 0, icon: 'return-down-back-outline' as const, route: '/(tabs)/inventory' },
    { label: 'Tasks remaining', count: checklist.tasksRemaining, ok: checklist.tasksRemaining === 0, icon: 'checkbox-outline' as const, route: '/(tabs)/tasks' },
    { label: 'Guests checked in', count: `${checklist.guestsCheckedInPercent}%`, ok: checklist.guestsCheckedInPercent === 100, icon: 'people-outline' as const, route: '/(tabs)/checkin' },
    { label: 'Documents on file', count: checklist.documentsCount, ok: checklist.documentsCount > 0, icon: 'document-text-outline' as const, route: '/(tabs)/documents' },
  ] : [];

  const handleClose = () => {
    if (!weddingId || !checklist) return;
    const outstanding = items.filter(i => !i.ok);
    const message = outstanding.length > 0
      ? `You still have outstanding items:\n${outstanding.map(i => `• ${i.label}`).join('\n')}\n\nClose the wedding anyway?`
      : 'Everything looks wrapped up. Mark this wedding as closed?';
    Alert.alert('Close Wedding', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark as Closed', style: 'destructive', onPress: async () => { await ClosingService.closeWedding(db, weddingId); await load(); } },
    ]);
  };

  const handleReopen = async () => {
    if (!weddingId) return;
    await ClosingService.reopenWedding(db, weddingId);
    await load();
  };

  if (isLoading && !checklist) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Post-Wedding Closing</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Wrap everything up cleanly</Typography>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <Card style={[styles.progressCard, { backgroundColor: theme.colors.primary }]}>
          <Typography variant="display" weight="heavy" color="#FFFFFF">{checklist?.completionPercent ?? 0}%</Typography>
          <Typography variant="body" color="rgba(255,255,255,0.85)">
            {checklist?.isClosed ? 'This wedding is marked closed' : 'Complete'}
          </Typography>
        </Card>

        {items.map((item) => (
          <Pressable key={item.label} onPress={() => router.push(item.route as any)}>
            <Card style={[styles.card, styles.itemRow]}>
              <Ionicons name={item.icon} size={22} color={item.ok ? theme.colors.success : theme.colors.warning} />
              <Typography variant="body" weight="medium" style={{ flex: 1, marginLeft: 12 }}>{item.label}</Typography>
              <View style={[styles.badge, { backgroundColor: item.ok ? '#F0FDF4' : '#FFFBEB' }]}>
                <Typography variant="caption" weight="bold" color={item.ok ? theme.colors.success : theme.colors.warning}>{item.count}</Typography>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} style={{ marginLeft: 8 }} />
            </Card>
          </Pressable>
        ))}

        {checklist?.isClosed ? (
          <Button label="Reopen Wedding" variant="outline" onPress={handleReopen} style={{ marginTop: 12 }} />
        ) : (
          <Button label="Mark Wedding as Closed" onPress={handleClose} style={{ marginTop: 12 }} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  progressCard: { padding: 24, marginBottom: 16, alignItems: 'center' },
  card: { padding: 14, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
