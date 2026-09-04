import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, EmptyState, Card } from '../components/ui';
import { theme } from '../theme';
import { AuthService } from '../services/auth';
import { getUserWedding } from '../services/wedding';
import { NotificationService, AppNotification } from '../services/notification';

export default function NotificationsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      async function fetchNotifications() {
        try {
          const session = await AuthService.getCurrentSession(db);
          if (session) {
            const wedding = await getUserWedding(db, session.id);
            if (wedding && isActive) {
              setWeddingId(wedding.id);
              const data = await NotificationService.getNotifications(db, wedding.id);
              setNotifications(data);
            }
          }
        } catch (e) {
          console.error(e instanceof Error ? e.message : String(e));
        } finally {
          if (isActive) setIsLoading(false);
        }
      }
      fetchNotifications();
      return () => { isActive = false; };
    }, [db])
  );

  const handleMarkAllRead = async () => {
    if (!weddingId) return;
    try {
      await NotificationService.markAllAsRead(db, weddingId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handlePress = async (notification: AppNotification) => {
    if (notification.is_read === 0) {
      try {
        await NotificationService.markAsRead(db, notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n));
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      }
    }

    // Navigation logic based on type
    switch (notification.type) {
      case 'EVENT':
        if (notification.reference_id) router.push(`/(tabs)/events/${notification.reference_id}` as any);
        else router.push('/(tabs)/events');
        break;
      case 'PAYMENT':
        if (notification.reference_id) router.push(`/(tabs)/vendors/${notification.reference_id}` as any);
        else router.push('/(tabs)/vendors' as any);
        break;
      case 'INVITATION':
        router.push('/(tabs)/patrika' as any);
        break;
      case 'ROOM':
        if (notification.reference_id) router.push(`/(tabs)/rooms/${notification.reference_id}` as any);
        else router.push('/(tabs)/rooms');
        break;
      case 'SYNC':
      case 'CUSTOM':
      case 'RSVP':
      default:
        // Default fallbacks or no direct navigation
        break;
    }
  };

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'EVENT': return { name: 'calendar', color: theme.colors.primary };
      case 'PAYMENT': return { name: 'card', color: theme.colors.error };
      case 'INVITATION': return { name: 'mail', color: theme.colors.warning };
      case 'ROOM': return { name: 'bed', color: theme.colors.primary };
      case 'SYNC': return { name: 'sync-circle', color: theme.colors.error };
      case 'RSVP': return { name: 'person-circle', color: theme.colors.success };
      default: return { name: 'notifications', color: theme.colors.textSecondary };
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = item.is_read === 0;
    const iconConfig = getIconForType(item.type);
    
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.card,
          isUnread && styles.cardUnread,
          pressed && styles.pressed
        ]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
          </View>
          <View style={styles.cardHeaderText}>
            <Typography variant="body" weight={isUnread ? "semibold" : "medium"}>
              {item.title}
            </Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>
              {item.created_at ? new Date(item.created_at * 1000).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
              }) : ''}
            </Typography>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        {item.body && (
          <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.bodyText}>
            {item.body}
          </Typography>
        )}
      </Pressable>
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Typography variant="sectionTitle" style={styles.title}>Notifications</Typography>
        
        {notifications.some(n => n.is_read === 0) ? (
          <Pressable onPress={handleMarkAllRead}>
            <Typography variant="body" color={theme.colors.primary} weight="medium">
              Mark all read
            </Typography>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} /> // Spacer for alignment
        )}
      </View>

      {notifications.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Ionicons name="notifications-off-outline" size={48} color={theme.colors.textMuted} />}
          title="No new notifications"
          description="You're all caught up! Important reminders and alerts will appear here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  backBtn: {
    padding: theme.spacing.xs,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.sm,
  },
  cardUnread: {
    backgroundColor: theme.colors.primary + '0A', // very light tint
    borderColor: theme.colors.primary + '33', // 20% opacity
  },
  pressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  cardHeaderText: {
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginLeft: theme.spacing.sm,
  },
  bodyText: {
    marginTop: theme.spacing.sm,
    marginLeft: 40, // align with text, account for icon
  },
});
