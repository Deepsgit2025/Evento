import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, SectionList, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer, Typography, EmptyState, Card, Button } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { EventService } from '../../../services/event';
import { Event } from '../../../database/types';
import { groupEventsByDate, getEventCountdown } from '../../../utils/date';

export default function EventsTimelineScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [nextEventCountdown, setNextEventCountdown] = useState<any>(null);
  const [hasFutureEvents, setHasFutureEvents] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // We use an effect purely for updating countdowns without hitting the DB again
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function fetchData() {
        setIsLoading(true);
        try {
          const session = await AuthService.getCurrentSession(db);
          if (session) {
            const wedding = await getUserWedding(db, session.id);
            if (wedding && isActive) {
              const fetchedEvents = await EventService.getEvents(db, wedding.id);
              if (isActive) {
                setEvents(fetchedEvents);
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch events", error instanceof Error ? error.message : String(error));
        } finally {
          if (isActive) setIsLoading(false);
        }
      }

      fetchData();

      return () => {
        isActive = false;
      };
    }, [db])
  );

  useEffect(() => {
    // Process events logic
    if (events.length === 0) {
      setGroupedEvents([]);
      setNextEvent(null);
      setNextEventCountdown(null);
      setHasFutureEvents(false);
      return;
    }

    const groups = groupEventsByDate(events);
    
    // Check "today" logic within groups
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    let foundFuture = false;
    let upcoming: Event | null = null;
    let upcomingCountdown: any = null;

    for (const event of events) {
      const countdown = getEventCountdown(event.date, event.start_time, event.end_time);
      if (countdown && !countdown.isPast) {
        foundFuture = true;
        // The events are sorted chronologically, so the first future event is the "next" event.
        if (!upcoming && !countdown.isNow) {
          upcoming = event;
          upcomingCountdown = countdown;
        }
      }
    }

    // Enhance groups with "isToday" flag
    const enhancedGroups = groups.map(g => {
      return {
        ...g,
        isToday: g.dateString === todayStr
      };
    });

    setGroupedEvents(enhancedGroups);
    setHasFutureEvents(foundFuture);
    setNextEvent(upcoming);
    setNextEventCountdown(upcomingCountdown);

  }, [events, tick]);

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    if (!h || !m) return time;
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; 
    return `${hour}:${m} ${ampm}`;
  };

  if (isLoading && events.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const renderEvent = ({ item }: { item: Event }) => {
    const countdown = getEventCountdown(item.date, item.start_time, item.end_time);
    
    return (
      <Pressable onPress={() => router.push(`/(tabs)/events/${item.id}`)}>
        <View style={styles.eventRow}>
          <View style={styles.timeCol}>
            <Typography variant="body" weight="semibold">{formatTime(item.start_time)}</Typography>
            {countdown?.isNow && (
              <View style={[styles.nowBadge, { backgroundColor: theme.colors.primary }]}>
                <Typography variant="caption" style={styles.nowBadgeText}>NOW</Typography>
              </View>
            )}
          </View>

          <View style={styles.cardCol}>
            <Card style={[styles.eventCard, { borderLeftColor: theme.colors.primary }]}>
              <View style={styles.eventNameContainer}>
                <Typography variant="body" weight="semibold">{item.name}</Typography>
                {item.event_type && (
                  <View style={styles.badge}>
                    <Typography variant="caption" weight="medium" style={styles.badgeText}>{item.event_type}</Typography>
                  </View>
                )}
              </View>
              
              <View style={styles.detailGrid}>
                {item.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                    <Typography variant="caption" color={theme.colors.textSecondary} style={styles.detailText} numberOfLines={1}>
                      {item.location}
                    </Typography>
                  </View>
                )}
              </View>
            </Card>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <Typography variant="body" weight="bold" color={section.isToday ? theme.colors.primary : theme.colors.textMuted}>
        {section.isToday ? `TODAY • ${section.data.length} event${section.data.length !== 1 ? 's' : ''}` : section.title}
      </Typography>
    </View>
  );

  const renderHeader = () => {
    if (events.length === 0) return null;
    
    if (nextEvent && nextEventCountdown) {
      return (
        <View style={styles.heroContainer}>
          <Typography variant="caption" weight="bold" color={theme.colors.primary} style={styles.heroLabel}>
            NEXT EVENT
          </Typography>
          <Card style={[styles.heroCard, { backgroundColor: theme.colors.surface }]}>
            <Typography variant="sectionTitle" style={styles.heroTitle}>{nextEvent.name}</Typography>
            <View style={styles.heroDetailRow}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.heroDetailText}>
                {formatTime(nextEvent.start_time)}
              </Typography>
            </View>
            {nextEvent.location && (
              <View style={styles.heroDetailRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.heroDetailText}>
                  {nextEvent.location}
                </Typography>
              </View>
            )}
            <View style={styles.countdownPill}>
              <Typography variant="bodySecondary" weight="semibold" color={theme.colors.primary}>
                {nextEventCountdown.label}
              </Typography>
            </View>
          </Card>
        </View>
      );
    }
    return null;
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Typography variant="sectionTitle">Timeline</Typography>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
            pressed && styles.pressedState
          ]}
          onPress={() => router.push('/(tabs)/events/add')}
        >
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Typography variant="body" weight="medium" color={theme.colors.primary} style={styles.addButtonText}>
            Add Event
          </Typography>
        </Pressable>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />}
            title="No events planned yet"
            description="Add your wedding functions to build your timeline."
            actionLabel="Add Event"
            onAction={() => router.push('/(tabs)/events/add')}
          />
        </View>
      ) : (!hasFutureEvents && groupedEvents.length > 0) ? (
        <SectionList
          sections={groupedEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
             <View style={styles.pastStateContainer}>
                <Typography variant="body" color={theme.colors.textSecondary} style={styles.pastStateText}>
                  All planned events have passed.
                </Typography>
             </View>
          )}
        />
      ) : (
        <SectionList
          sections={groupedEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  addButtonText: {
    marginLeft: 4,
  },
  pressedState: {
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  pastStateContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  pastStateText: {
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // sticky header blends in
  },
  eventRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  timeCol: {
    width: 80,
    paddingRight: spacing.md,
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
  },
  nowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  nowBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardCol: {
    flex: 1,
  },
  eventCard: {
    padding: spacing.md,
    marginBottom: 0,
    borderLeftWidth: 4,
  },
  eventNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: '#F3E8FF',
  },
  badgeText: {
    color: '#7E22CE',
  },
  detailGrid: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 6,
    flex: 1,
  },
  heroContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  heroLabel: {
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  heroCard: {
    padding: spacing.lg,
  },
  heroTitle: {
    marginBottom: spacing.md,
  },
  heroDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroDetailText: {
    marginLeft: 8,
  },
  countdownPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: '#F0FDF4', // Light green
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
});
