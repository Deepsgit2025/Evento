import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, EmptyState, Card, StatusPicker, StatusOption } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { VendorEventService, VendorArrivalRow } from '../../../services/vendorEvent';
import { VendorArrivalStatus } from '../../../database/types';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'NOT_ARRIVED', label: 'Not arrived', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'ON_THE_WAY', label: 'On the way', color: '#D97706', bg: '#FFFBEB' },
  { value: 'ARRIVED', label: 'Arrived', color: '#16A34A', bg: '#F0FDF4' },
  { value: 'DELAYED', label: 'Delayed', color: '#DC2626', bg: '#FEF2F2' },
  { value: 'COMPLETED', label: 'Completed', color: '#2563EB', bg: '#EFF6FF' },
];

export default function VendorArrivalTrackerScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();

  const [rows, setRows] = useState<VendorArrivalRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setRows(await VendorEventService.getArrivalsForWedding(db, wedding.id));
    } catch (e) {
      console.error('Failed to load vendor arrivals', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (row: VendorArrivalRow, status: string) => {
    await VendorEventService.updateArrivalStatus(db, row.assignment_id, status as VendorArrivalStatus, {
      actual_arrival: status === 'ARRIVED' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    });
    await load();
  };

  if (isLoading && rows.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const delayedCount = rows.filter(r => r.status === 'DELAYED').length;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Vendor Arrivals</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
          {delayedCount > 0 ? `${delayedCount} vendor${delayedCount > 1 ? 's' : ''} delayed` : 'Live check-in status for every vendor'}
        </Typography>
      </View>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="briefcase-outline" size={48} color={theme.colors.textMuted} />}
          title="No vendors assigned to events yet"
          description="Assign vendors to events from a vendor's profile to track their arrival here."
          actionLabel="Go to Vendors"
          onAction={() => router.push('/(tabs)/vendors')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {rows.map((row) => {
            const meta = STATUS_OPTIONS.find(o => o.value === row.status) || STATUS_OPTIONS[0];
            const expanded = expandedId === row.assignment_id;
            return (
              <Card key={row.assignment_id} style={styles.card}>
                <Pressable onPress={() => setExpandedId(expanded ? null : row.assignment_id)} style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Typography variant="cardTitle">{row.vendor_name}</Typography>
                      <View style={[styles.chip, { backgroundColor: meta.bg }]}>
                        <Typography variant="caption" weight="bold" color={meta.color}>{meta.label}</Typography>
                      </View>
                    </View>
                    <Typography variant="bodySecondary" color={theme.colors.textSecondary}>{row.category} • {row.event_name}</Typography>
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
                </Pressable>

                {expanded && (
                  <View style={[styles.expanded, { borderTopColor: theme.colors.borderLight }]}>
                    <StatusPicker options={STATUS_OPTIONS} value={row.status} onChange={(v) => updateStatus(row, v)} />
                    {row.phone && (
                      <Pressable style={styles.callRow} onPress={() => Linking.openURL(`tel:${row.phone}`).catch(() => {})}>
                        <Ionicons name="call" size={16} color={theme.colors.primary} />
                        <Typography variant="body" weight="semibold" color={theme.colors.primary} style={{ marginLeft: 8 }}>Call {row.vendor_name}</Typography>
                      </Pressable>
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  card: { padding: 16, marginBottom: 12 },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  callRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});
