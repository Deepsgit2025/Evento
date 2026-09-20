import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, Card, SearchInput } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { CheckinService, CheckinStats } from '../../services/checkin';
import { Guest } from '../../database/types';

export default function GuestCheckinScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [recent, setRecent] = useState<Guest[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setStats(await CheckinService.getStats(db, wedding.id));
      setRecent(await CheckinService.getRecent(db, wedding.id));
    } catch (e) {
      console.error('Failed to load check-in dashboard', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!weddingId || !text.trim()) { setResults([]); return; }
    setResults(await CheckinService.search(db, weddingId, text.trim()));
  }, [db, weddingId]);

  const checkIn = async (guest: Guest) => {
    await CheckinService.checkIn(db, guest.id);
    setQuery(''); setResults([]);
    await load();
  };

  const undo = async (guest: Guest) => {
    await CheckinService.undoCheckIn(db, guest.id);
    await load();
  };

  if (isLoading && !stats) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Guest Check-in</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Search by name, phone, or check-in code</Typography>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.cardRose }]}>
            <Typography variant="screenTitle" weight="heavy" color={theme.colors.primary}>{stats?.totalPeople ?? 0}</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>Total Invited</Typography>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.cardGreen }]}>
            <Typography variant="screenTitle" weight="heavy" color={theme.colors.success}>{stats?.checkedInPeople ?? 0}</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>Checked In</Typography>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.cardGold }]}>
            <Typography variant="screenTitle" weight="heavy" color={theme.colors.accentDark}>{(stats?.totalPeople ?? 0) - (stats?.checkedInPeople ?? 0)}</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>Not Arrived</Typography>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.cardPurple }]}>
            <Typography variant="screenTitle" weight="heavy" color={theme.colors.primary}>{stats?.percentage ?? 0}%</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>Arrived</Typography>
          </View>
        </View>

        <SearchInput
          placeholder="Search guests..."
          value={query}
          onChangeText={runSearch}
          containerStyle={{ marginBottom: theme.spacing.lg }}
        />

        {query.trim().length > 0 && (
          <View style={styles.section}>
            <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.sectionLabel}>RESULTS</Typography>
            {results.length === 0 ? (
              <Typography variant="bodySecondary" color={theme.colors.textSecondary}>No guests match "{query}".</Typography>
            ) : results.map((g) => (
              <Card key={g.id} style={[styles.card, styles.guestRow]}>
                <View style={{ flex: 1 }}>
                  <Typography variant="body" weight="semibold">{g.full_name}</Typography>
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    Party of {g.party_size} • Code: {g.checkin_code || '—'}
                  </Typography>
                </View>
                {g.checked_in_at ? (
                  <Pressable onPress={() => undo(g)} style={[styles.actionChip, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Typography variant="caption" weight="bold" color={theme.colors.success} style={{ marginLeft: 4 }}>Arrived</Typography>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => checkIn(g)} style={[styles.actionChip, { backgroundColor: theme.colors.primary }]}>
                    <Typography variant="caption" weight="bold" color="#FFFFFF">Check In</Typography>
                  </Pressable>
                )}
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.sectionLabel}>RECENTLY CHECKED IN</Typography>
          {recent.length === 0 ? (
            <Typography variant="bodySecondary" color={theme.colors.textSecondary}>No one has checked in yet.</Typography>
          ) : recent.map((g) => (
            <Card key={g.id} style={[styles.card, styles.guestRow]}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Typography variant="body" weight="medium" style={{ flex: 1, marginLeft: 10 }}>{g.full_name}</Typography>
              <Typography variant="caption" color={theme.colors.textMuted}>Party of {g.party_size}</Typography>
            </Card>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '47%', padding: 16, borderRadius: 20 },
  section: { marginBottom: 20 },
  sectionLabel: { marginBottom: 10, letterSpacing: 0.5 },
  card: { padding: 14, marginBottom: 8 },
  guestRow: { flexDirection: 'row', alignItems: 'center' },
  actionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
