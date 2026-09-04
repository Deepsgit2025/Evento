import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { Typography } from './Typography';

export function HeaderNotificationIcon({ tintColor }: { tintColor?: string } = {}) {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const [unreadCount, setUnreadCount] = React.useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const fetchCount = async () => {
        try {
          const session = await AuthService.getCurrentSession(db);
          if (!session) return;
          const wedding = await getUserWedding(db, session.id);
          if (!wedding) return;

          const result = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM notifications WHERE wedding_id = ? AND is_read = 0`,
            [wedding.id]
          );
          if (active && result) setUnreadCount(result.count);
        } catch {
          // Table might not exist yet
        }
      };
      fetchCount();
      return () => { active = false; };
    }, [db])
  );

  return (
    <Pressable onPress={() => router.push('/notifications' as any)} style={styles.container}>
      <Ionicons name="notifications-outline" size={24} color={tintColor || theme.colors.text} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
          <Typography variant="caption" weight="bold" color="#fff" style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Typography>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, lineHeight: 14 },
});
