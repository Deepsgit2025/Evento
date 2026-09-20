import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, EmptyState, Card, Button, TextInput, StatusPicker, StatusOption } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { EventService } from '../../../services/event';
import { Event, EventStatus } from '../../../database/types';
import { getEventCountdown } from '../../../utils/date';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'UPCOMING', label: 'Upcoming', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'RUNNING', label: 'Running', color: '#16A34A', bg: '#F0FDF4' },
  { value: 'DELAYED', label: 'Delayed', color: '#D97706', bg: '#FFFBEB' },
  { value: 'COMPLETED', label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'PROBLEM', label: 'Problem', color: '#DC2626', bg: '#FEF2F2' },
];

function statusMeta(status?: EventStatus) {
  return STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
}

function formatTime(time: string | null | undefined) {
  if (!time) return '';
  const [h, m] = time.split(':');
  if (!h || !m) return time;
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

export default function ControlRoomScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      const rows = await EventService.getEvents(db, wedding.id);
      setEvents(rows);
    } catch (e) {
      console.error('Failed to load control room', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleExpand = (event: Event) => {
    if (expandedId === event.id) {
      setExpandedId(null);
    } else {
      setExpandedId(event.id);
      setDelayReason(event.delay_reason || '');
      setNotes(event.manager_notes || '');
    }
  };

  const applyStatus = async (event: Event, status: EventStatus) => {
    setIsSaving(true);
    try {
      const extra: any = { status };
      if (status !== 'DELAYED') extra.delay_reason = null;
      await EventService.updateEvent(db, event.id, extra);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const saveDetails = async (event: Event) => {
    setIsSaving(true);
    try {
      await EventService.updateEvent(db, event.id, {
        delay_reason: delayReason.trim() || null,
        manager_notes: notes.trim() || null,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const callResponsible = (phone: string | null | undefined) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  if (isLoading && events.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const now = events.filter(e => {
    const c = getEventCountdown(e.date, e.start_time, e.end_time);
    return c?.isNow;
  });
  const upcoming = events.filter(e => !now.includes(e));

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Wedding Control Room</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
            Live status for every function
          </Typography>
        </View>
      </View>

      {events.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="tv-outline" size={48} color={theme.colors.textMuted} />}
          title="No events yet"
          description="Add your wedding functions in the Events tab to manage them live here."
          actionLabel="Go to Events"
          onAction={() => router.push('/(tabs)/events')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {now.length > 0 && (
            <View style={styles.section}>
              <Typography variant="caption" weight="bold" color={theme.colors.primary} style={styles.sectionLabel}>
                HAPPENING NOW
              </Typography>
              {now.map(e => renderEventCard(e))}
            </View>
          )}

          <View style={styles.section}>
            <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.sectionLabel}>
              ALL FUNCTIONS
            </Typography>
            {upcoming.map(e => renderEventCard(e))}
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );

  function renderEventCard(event: Event) {
    const meta = statusMeta(event.status);
    const countdown = getEventCountdown(event.date, event.start_time, event.end_time);
    const expanded = expandedId === event.id;

    return (
      <Card key={event.id} style={styles.eventCard}>
        <Pressable onPress={() => toggleExpand(event)} style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Typography variant="cardTitle">{event.name}</Typography>
              <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <Typography variant="caption" weight="bold" color={meta.color}>{meta.label}</Typography>
              </View>
            </View>
            <View style={styles.metaRow}>
              {event.start_time && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                  <Typography variant="caption" color={theme.colors.textSecondary}>{formatTime(event.start_time)}</Typography>
                </View>
              )}
              {event.location && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
                  <Typography variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>{event.location}</Typography>
                </View>
              )}
              {event.responsible_person && (
                <View style={styles.metaItem}>
                  <Ionicons name="person-outline" size={13} color={theme.colors.textSecondary} />
                  <Typography variant="caption" color={theme.colors.textSecondary}>{event.responsible_person}</Typography>
                </View>
              )}
            </View>
            {countdown && !countdown.isPast && (
              <Typography variant="caption" weight="medium" color={theme.colors.primary} style={{ marginTop: 4 }}>
                {countdown.label}
              </Typography>
            )}
            {event.status === 'DELAYED' && event.delay_reason && (
              <Typography variant="caption" color="#D97706" style={{ marginTop: 4 }}>
                Delay: {event.delay_reason}
              </Typography>
            )}
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
        </Pressable>

        {expanded && (
          <View style={[styles.expandedArea, { borderTopColor: theme.colors.borderLight }]}>
            <Typography variant="caption" weight="medium" color={theme.colors.textSecondary} style={styles.label}>
              UPDATE STATUS
            </Typography>
            <StatusPicker options={STATUS_OPTIONS} value={event.status || 'UPCOMING'} onChange={(v) => applyStatus(event, v as EventStatus)} disabled={isSaving} />

            {event.status === 'DELAYED' && (
              <TextInput
                label="Delay reason"
                placeholder="e.g. Waiting for baraat to arrive"
                value={delayReason}
                onChangeText={setDelayReason}
                containerStyle={{ marginTop: theme.spacing.md }}
              />
            )}

            <TextInput
              label="Notes"
              placeholder="Any notes for the team"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              containerStyle={{ marginTop: theme.spacing.sm }}
            />

            <View style={styles.actionsRow}>
              <Button label="Save notes" variant="outline" onPress={() => saveDetails(event)} isLoading={isSaving} style={{ flex: 1 }} />
              {event.responsible_phone && (
                <Button label="Call" icon="call" variant="primary" onPress={() => callResponsible(event.responsible_phone)} style={{ flex: 1 }} />
              )}
            </View>
          </View>
        )}
      </Card>
    );
  }
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionLabel: { marginBottom: 12, letterSpacing: 0.5 },
  eventCard: { padding: 16, marginBottom: 12 },
  eventHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandedArea: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  label: { marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
