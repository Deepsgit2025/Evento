import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, EmptyState, Button } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { DanceService } from '../../../services/dance';
import { Dance } from '../../../database/types';

export default function DancesScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [weddingId, setWeddingId] = useState('');
  const [dances, setDances] = useState<Dance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDances = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      const rows = await DanceService.getDances(db, wedding.id);
      setDances(rows);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { fetchDances(); }, [fetchDances]));

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= dances.length) return;
    const reordered = [...dances];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setDances(reordered);
    await DanceService.reorder(db, weddingId, reordered.map(d => d.id));
  };

  const handleDelete = (dance: Dance) => {
    Alert.alert('Delete Dance', `Remove "${dance.title}" from the lineup?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await DanceService.deleteDance(db, dance.id);
          fetchDances();
        }
      }
    ]);
  };

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Typography variant="screenTitle">Dance Lineup</Typography>
        <Button
          label=""
          leftIcon={<Ionicons name="add" size={20} color="#fff" />}
          onPress={() => router.push('/(tabs)/dances/add' as any)}
          style={styles.addButton}
        />
      </View>

      {dances.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="musical-notes-outline" size={48} color={theme.colors.border} />}
            title="No dances planned yet"
            description="Plan the first dance, father-daughter dance, and any performances — with songs, performers, and practice reminders."
            actionLabel="+ Add Dance"
            onAction={() => router.push('/(tabs)/dances/add' as any)}
          />
        </View>
      ) : (
        <FlatList
          data={dances}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(tabs)/dances/add?editId=${item.id}` as any)}
            >
              <View style={styles.orderControls}>
                <Pressable onPress={() => handleMove(index, -1)} disabled={index === 0} hitSlop={6}>
                  <Ionicons name="chevron-up" size={18} color={index === 0 ? theme.colors.border : theme.colors.textSecondary} />
                </Pressable>
                <Typography variant="caption" weight="bold" color={theme.colors.textMuted}>{index + 1}</Typography>
                <Pressable onPress={() => handleMove(index, 1)} disabled={index === dances.length - 1} hitSlop={6}>
                  <Ionicons name="chevron-down" size={18} color={index === dances.length - 1 ? theme.colors.border : theme.colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.cardBody}>
                <Typography variant="body" weight="semibold">{item.title}</Typography>
                {item.performers && (
                  <Typography variant="caption" color={theme.colors.textSecondary}>{item.performers}</Typography>
                )}
                {item.song_title && (
                  <View style={styles.songRow}>
                    <Ionicons name="musical-note" size={13} color={theme.colors.primary} />
                    <Typography variant="caption" color={theme.colors.text} style={{ marginLeft: 4 }}>
                      {item.song_title}{item.song_artist ? ` — ${item.song_artist}` : ''}
                    </Typography>
                  </View>
                )}
                {item.practice_time && (
                  <View style={styles.songRow}>
                    <Ionicons name={item.reminder_style === 'ALARM' ? 'alarm-outline' : 'notifications-outline'} size={13} color={theme.colors.textSecondary} />
                    <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>
                      Practice: {new Date(item.practice_time * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </View>
                )}
              </View>

              <Pressable onPress={() => handleDelete(item)} hitSlop={8} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: theme.spacing.lg,
  },
  addButton: {
    width: 44, height: 44, paddingHorizontal: 0, borderRadius: 22,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  orderControls: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
    gap: 2,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
});
