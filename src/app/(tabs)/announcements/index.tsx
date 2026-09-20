import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, EmptyState, Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { AnnouncementService } from '../../../services/announcement';
import { Announcement, AnnouncementPriority } from '../../../database/types';

const PRIORITY_META: Record<AnnouncementPriority, { color: string; bg: string }> = {
  LOW: { color: '#6B7280', bg: '#F3F4F6' },
  NORMAL: { color: '#2563EB', bg: '#EFF6FF' },
  HIGH: { color: '#D97706', bg: '#FFFBEB' },
  URGENT: { color: '#DC2626', bg: '#FEF2F2' },
};

function timeAgo(unixSeconds: number) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AnnouncementsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();

  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setItems(await AnnouncementService.getAnnouncements(db, wedding.id));
    } catch (e) {
      console.error('Failed to load announcements', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleExpire = async (a: Announcement) => {
    await AnnouncementService.setStatus(db, a.id, a.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE');
    await load();
  };

  if (isLoading && items.length === 0) {
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
          <Typography variant="screenTitle">Announcements</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Keep everyone in the loop</Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => router.push('/(tabs)/announcements/add')}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="megaphone-outline" size={48} color={theme.colors.textMuted} />}
          title="No announcements yet"
          description='Post updates like "Dinner is now open" for your team and guests to see.'
          actionLabel="New Announcement"
          onAction={() => router.push('/(tabs)/announcements/add')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.map((a) => {
            const meta = PRIORITY_META[a.priority];
            return (
              <Card key={a.id} style={[styles.card, a.status === 'EXPIRED' && { opacity: 0.5 }]}>
                <View style={styles.rowBetween}>
                  <View style={[styles.chip, { backgroundColor: meta.bg }]}>
                    <Typography variant="caption" weight="bold" color={meta.color}>{a.priority}</Typography>
                  </View>
                  <Typography variant="caption" color={theme.colors.textMuted}>{timeAgo(a.created_at)}</Typography>
                </View>
                <Typography variant="cardTitle" style={{ marginTop: 8 }}>{a.title}</Typography>
                <Typography variant="body" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>{a.message}</Typography>
                <Pressable onPress={() => toggleExpire(a)} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                  <Typography variant="caption" weight="bold" color={theme.colors.primary}>
                    {a.status === 'ACTIVE' ? 'Mark as expired' : 'Reactivate'}
                  </Typography>
                </Pressable>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  card: { padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
});
