import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, EmptyState, Card, TextInput, Button, StatusPicker, StatusOption } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { TransportService } from '../../services/transport';
import { TransportRequest, TransportStatus } from '../../database/types';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'PENDING', label: 'Pending', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'ASSIGNED', label: 'Assigned', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'COMPLETED', label: 'Completed', color: '#16A34A', bg: '#F0FDF4' },
];

export default function TransportationScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setRequests(await TransportService.getRequests(db, wedding.id));
    } catch (e) {
      console.error('Failed to load transportation', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!weddingId || !guestName.trim()) return;
    setIsSaving(true);
    try {
      await TransportService.addRequest(db, weddingId, {
        guest_name: guestName.trim(), pickup_location: pickup.trim() || undefined,
        drop_location: drop.trim() || undefined, requested_time: requestedTime.trim() || undefined,
      });
      setGuestName(''); setPickup(''); setDrop(''); setRequestedTime(''); setShowAddForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (req: TransportRequest, status: string) => {
    await TransportService.updateStatus(db, req.id, status as TransportStatus);
    await load();
  };

  if (isLoading && requests.length === 0) {
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
          <Typography variant="screenTitle">Transportation</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Guest pickup & drop requests</Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => setShowAddForm(v => !v)}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <Card style={styles.card}>
            <TextInput label="Guest / Family Name" placeholder="e.g. Sharma Family" value={guestName} onChangeText={setGuestName} />
            <TextInput label="Pickup Location" placeholder="e.g. Airport, Railway Station" value={pickup} onChangeText={setPickup} />
            <TextInput label="Drop Location" placeholder="e.g. Hotel, Venue" value={drop} onChangeText={setDrop} />
            <TextInput label="Requested Time" placeholder="e.g. Tomorrow 4 PM" value={requestedTime} onChangeText={setRequestedTime} />
            <Button label={isSaving ? 'Adding...' : 'Add Request'} onPress={handleAdd} isLoading={isSaving} disabled={!guestName.trim()} />
          </Card>
        )}

        {requests.length === 0 && !showAddForm ? (
          <EmptyState
            icon={<Ionicons name="bus-outline" size={48} color={theme.colors.textMuted} />}
            title="No transport requests yet"
            description="Track guest pickup and drop needs. For the groom's own procession, see Baraat Tracker."
            actionLabel="Add Request"
            onAction={() => setShowAddForm(true)}
          />
        ) : (
          requests.map((req) => {
            const meta = STATUS_OPTIONS.find(o => o.value === req.status)!;
            const expanded = expandedId === req.id;
            return (
              <Card key={req.id} style={styles.card}>
                <Pressable onPress={() => setExpandedId(expanded ? null : req.id)} style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Typography variant="cardTitle">{req.guest_name || 'Guest'}</Typography>
                      <View style={[styles.chip, { backgroundColor: meta.bg }]}>
                        <Typography variant="caption" weight="bold" color={meta.color}>{meta.label}</Typography>
                      </View>
                    </View>
                    <Typography variant="bodySecondary" color={theme.colors.textSecondary} numberOfLines={1}>
                      {req.pickup_location || '—'} → {req.drop_location || '—'}
                    </Typography>
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
                </Pressable>
                {expanded && (
                  <View style={[styles.expandedArea, { borderTopColor: theme.colors.borderLight }]}>
                    <StatusPicker options={STATUS_OPTIONS} value={req.status} onChange={(v) => updateStatus(req, v)} />
                    {req.requested_time && <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 8 }}>Requested: {req.requested_time}</Typography>}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { paddingHorizontal: 24 },
  card: { padding: 16, marginBottom: 12 },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  expandedArea: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
});
