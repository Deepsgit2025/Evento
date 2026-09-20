import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, EmptyState, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { PhotoService } from '../../services/photo';

export default function WeddingMemoriesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<{ eventId: string | null; eventName: string; photos: any[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setGroups(await PhotoService.getPhotosGroupedByEvent(db, wedding.id));
    } catch (e) {
      console.error('Failed to load wedding memories', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (isLoading && groups.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const totalPhotos = groups.reduce((sum, g) => sum + g.photos.length, 0);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Wedding Memories</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary}>A timeline of your celebrations</Typography>
      </View>

      {totalPhotos === 0 ? (
        <EmptyState
          icon={<Ionicons name="heart-outline" size={48} color={theme.colors.textMuted} />}
          title="No memories yet"
          description="Add photos in Photo Collection and they'll show up here, organized by event."
          actionLabel="Go to Photo Collection"
          onAction={() => router.push('/(tabs)/photos')}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <View key={group.eventId || 'unsorted'} style={styles.section}>
              <Typography variant="sectionTitle" weight="heavy" style={{ marginBottom: 12 }}>{group.eventName}</Typography>
              <Card style={styles.card}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                  {group.photos.map((p) => (
                    <Image key={p.id} source={{ uri: p.uri }} style={styles.photo} contentFit="cover" />
                  ))}
                </ScrollView>
                <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 10 }}>
                  {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}
                </Typography>
              </Card>
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  section: { marginBottom: 20 },
  card: { padding: 16 },
  photoRow: { gap: 8 },
  photo: { width: 120, height: 120, borderRadius: 12 },
});
