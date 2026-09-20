import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card, StatusPicker, StatusOption } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { BaraatService } from '../../../services/baraat';
import { GuestService } from '../../../services/guest';
import { BaraatTrip, BaraatStatus, Guest } from '../../../database/types';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'PREPARING', label: 'Preparing', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'STARTED', label: 'Started', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'ON_THE_WAY', label: 'On the way', color: '#D97706', bg: '#FFFBEB' },
  { value: 'ARRIVED', label: 'Arrived', color: '#16A34A', bg: '#F0FDF4' },
  { value: 'COMPLETED', label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
];

export default function BaraatTripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [trip, setTrip] = useState<BaraatTrip | null>(null);
  const [assigned, setAssigned] = useState<Guest[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const t = await BaraatService.getTripById(db, id);
      setTrip(t);
      setAssigned(await BaraatService.getAssignedGuests(db, id));

      const session = await AuthService.getCurrentSession(db);
      if (session) {
        const wedding = await getUserWedding(db, session.id);
        if (wedding) setAllGuests(await GuestService.getGuests(db, wedding.id));
      }
    } catch (e) {
      console.error('Failed to load trip', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (status: string) => {
    if (!trip) return;
    setIsSaving(true);
    try {
      await BaraatService.updateStatus(db, trip.id, status as BaraatStatus);
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGuest = async (guestId: string, isAssigned: boolean) => {
    if (!trip) return;
    if (isAssigned) await BaraatService.unassignGuest(db, trip.id, guestId);
    else await BaraatService.assignGuest(db, trip.id, guestId);
    setAssigned(await BaraatService.getAssignedGuests(db, trip.id));
  };

  const confirmDelete = () => {
    if (!trip) return;
    Alert.alert('Delete vehicle?', `Remove "${trip.vehicle}" from the baraat tracker?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await BaraatService.deleteTrip(db, trip.id); router.back(); } },
    ]);
  };

  if (isLoading || !trip) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const assignedIds = new Set(assigned.map(g => g.id));

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Typography variant="sectionTitle" numberOfLines={1} style={{ flex: 1, marginLeft: 8 }}>{trip.vehicle}</Typography>
        <Pressable onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={{ marginBottom: 8 }}>STATUS</Typography>
          <StatusPicker options={STATUS_OPTIONS} value={trip.status} onChange={updateStatus} disabled={isSaving} />
        </Card>

        <Card style={styles.card}>
          {trip.driver_name && <DetailRow icon="person-outline" label={trip.driver_name} theme={theme} />}
          {trip.driver_phone && (
            <Pressable onPress={() => Linking.openURL(`tel:${trip.driver_phone}`).catch(() => {})}>
              <DetailRow icon="call-outline" label={trip.driver_phone} theme={theme} action="Call" />
            </Pressable>
          )}
          {(trip.pickup_location || trip.destination) && (
            <DetailRow icon="navigate-outline" label={`${trip.pickup_location || '—'} → ${trip.destination || '—'}`} theme={theme} />
          )}
          {trip.capacity != null && <DetailRow icon="people-outline" label={`Capacity: ${trip.capacity}`} theme={theme} />}
          {trip.estimated_arrival && <DetailRow icon="time-outline" label={`ETA ${trip.estimated_arrival}`} theme={theme} />}
          {trip.notes && <DetailRow icon="document-text-outline" label={trip.notes} theme={theme} />}
        </Card>

        <View style={styles.rowBetween}>
          <Typography variant="sectionTitle" weight="heavy">Assigned Guests ({assigned.length})</Typography>
          <Pressable onPress={() => setShowAssign(v => !v)}>
            <Typography variant="body" weight="semibold" color={theme.colors.primary}>{showAssign ? 'Done' : 'Manage'}</Typography>
          </Pressable>
        </View>

        {!showAssign ? (
          assigned.length === 0 ? (
            <Typography variant="bodySecondary" color={theme.colors.textSecondary}>No guests assigned yet.</Typography>
          ) : (
            assigned.map(g => (
              <Card key={g.id} style={styles.guestCard}>
                <Typography variant="body" weight="medium">{g.full_name}</Typography>
              </Card>
            ))
          )
        ) : (
          allGuests.map(g => {
            const isAssigned = assignedIds.has(g.id);
            return (
              <Pressable key={g.id} onPress={() => toggleGuest(g.id, isAssigned)}>
                <Card style={[styles.guestCard, styles.guestRow]}>
                  <Typography variant="body" weight="medium">{g.full_name}</Typography>
                  <Ionicons name={isAssigned ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={isAssigned ? theme.colors.success : theme.colors.textMuted} />
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailRow({ icon, label, theme, action }: { icon: any; label: string; theme: any; action?: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      <Typography variant="body" style={{ flex: 1, marginLeft: 10 }}>{label}</Typography>
      {action && <Typography variant="caption" weight="bold" color={theme.colors.primary}>{action}</Typography>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  content: { padding: 16, paddingBottom: 120 },
  card: { padding: 16, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  guestCard: { padding: 14, marginBottom: 8 },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
