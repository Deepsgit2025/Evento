import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, EmptyState, Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { BaraatService } from '../../../services/baraat';
import { BaraatTrip, BaraatStatus } from '../../../database/types';

const STATUS_META: Record<BaraatStatus, { label: string; color: string; bg: string }> = {
  PREPARING: { label: 'Preparing', color: '#6B7280', bg: '#F3F4F6' },
  STARTED: { label: 'Started', color: '#2563EB', bg: '#EFF6FF' },
  ON_THE_WAY: { label: 'On the way', color: '#D97706', bg: '#FFFBEB' },
  ARRIVED: { label: 'Arrived', color: '#16A34A', bg: '#F0FDF4' },
  COMPLETED: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
};

export default function BaraatTrackerScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [trips, setTrips] = useState<BaraatTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setTrips(await BaraatService.getTrips(db, wedding.id));
    } catch (e) {
      console.error('Failed to load baraat trips', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (isLoading && trips.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Baraat Tracker</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Vehicles &amp; the groom's procession</Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => router.push('/(tabs)/baraat/add')}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      {trips.length === 0 && !weddingId ? null : trips.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="car-outline" size={48} color={theme.colors.textMuted} />}
          title="No vehicles added yet"
          description="Add the baraat's vehicles, drivers, and pickup details."
          actionLabel="Add Vehicle"
          onAction={() => router.push('/(tabs)/baraat/add')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {trips.map((trip) => {
            const meta = STATUS_META[trip.status];
            return (
              <Pressable key={trip.id} onPress={() => router.push(`/(tabs)/baraat/${trip.id}`)}>
                <Card style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Typography variant="cardTitle">{trip.vehicle}</Typography>
                    <View style={[styles.chip, { backgroundColor: meta.bg }]}>
                      <Typography variant="caption" weight="bold" color={meta.color}>{meta.label}</Typography>
                    </View>
                  </View>
                  {trip.driver_name && (
                    <View style={styles.metaRow}>
                      <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
                      <Typography variant="bodySecondary" color={theme.colors.textSecondary}>{trip.driver_name}</Typography>
                    </View>
                  )}
                  {(trip.pickup_location || trip.destination) && (
                    <View style={styles.metaRow}>
                      <Ionicons name="navigate-outline" size={14} color={theme.colors.textSecondary} />
                      <Typography variant="bodySecondary" color={theme.colors.textSecondary} numberOfLines={1}>
                        {trip.pickup_location || '—'} → {trip.destination || '—'}
                      </Typography>
                    </View>
                  )}
                  {trip.estimated_arrival && (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                      <Typography variant="bodySecondary" color={theme.colors.textSecondary}>ETA {trip.estimated_arrival}</Typography>
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  card: { padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
});
