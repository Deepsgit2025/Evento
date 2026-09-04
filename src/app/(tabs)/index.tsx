import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, ScrollView, Dimensions } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer, Typography, EmptyState, Card } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { Wedding } from '../../database/types';
import { getDaysUntil } from '../../utils/date';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import { useSync } from '../../context/SyncContext';
import { HeaderNotificationIcon } from '../../components/ui/HeaderNotificationIcon';
import { useLanguage } from '../../i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardStats {
  totalPeople: number; // SUM(party_size) — actual people count
  guestCount: number;  // COUNT(*) — number of guest records/families
  roomCount: number;
  eventCount: number;
  vendorCount: number;
  unassignedGuests: number;
  pendingPayments: number;
  totalBudget: number | null;
  totalSpent: number;
  remainingBudget: number | null;
  upcomingEvents: any[];
}

export default function HomeTab() {
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalPeople: 0, guestCount: 0, roomCount: 0, eventCount: 0, vendorCount: 0,
    unassignedGuests: 0, pendingPayments: 0, totalBudget: null, totalSpent: 0,
    remainingBudget: null, upcomingEvents: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { status, manualSync } = useSync();
  const { theme } = useTheme();

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      async function fetchDashboardData() {
        setIsLoading(true);
        try {
          const session = await AuthService.getCurrentSession(db);
          if (session) {
            const userWedding = await getUserWedding(db, session.id);
            if (isActive) setWedding(userWedding);
            
            if (userWedding) {
              const getCount = async (query: string, params: any[]) => {
                try {
                  const result = await db.getFirstAsync<{count: number}>(query, params);
                  return result ? result.count : 0;
                } catch { return 0; }
              };

              const getSum = async (query: string, params: any[]) => {
                try {
                  const result = await db.getFirstAsync<{total: number}>(query, params);
                  return result ? (result.total || 0) : 0;
                } catch { return 0; }
              };

              const wId = userWedding.id;
              
              const [
                guestCount, totalPeople, roomCount, eventCount, vendorCount,
                unassignedGuests, pendingPayments,
                vendorPaidTotal, generalExpensesTotal
              ] = await Promise.all([
                getCount(`SELECT COUNT(*) as count FROM guests WHERE wedding_id = ?`, [wId]),
                getSum(`SELECT COALESCE(SUM(party_size), 0) as total FROM guests WHERE wedding_id = ?`, [wId]),
                getCount(`SELECT COUNT(*) as count FROM rooms r JOIN hotels h ON r.hotel_id = h.id WHERE h.wedding_id = ?`, [wId]),
                getCount(`SELECT COUNT(*) as count FROM events WHERE wedding_id = ?`, [wId]),
                getCount(`SELECT COUNT(*) as count FROM vendors WHERE wedding_id = ?`, [wId]),
                getCount(`SELECT COUNT(*) as count FROM guests WHERE wedding_id = ? AND id NOT IN (SELECT guest_id FROM room_assignments)`, [wId]),
                getCount(`SELECT COUNT(*) as count FROM vendors v WHERE v.wedding_id = ? AND v.agreed_amount > COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.vendor_id = v.id), 0)`, [wId]),
                getSum(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE wedding_id = ?`, [wId]),
                getSum(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE wedding_id = ?`, [wId]),
              ]);

              const totalSpent = vendorPaidTotal + generalExpensesTotal;
              const totalBudget = userWedding.budget ?? null;
              const remainingBudget = totalBudget !== null ? totalBudget - totalSpent : null;

              let upcomingEvents: any[] = [];
              try {
                upcomingEvents = await db.getAllAsync(`SELECT * FROM events WHERE wedding_id = ? ORDER BY date ASC, start_time ASC LIMIT 3`, [wId]);
              } catch { upcomingEvents = []; }

              if (isActive) {
                setStats({
                  totalPeople, guestCount, roomCount, eventCount, vendorCount,
                  unassignedGuests, pendingPayments, totalBudget, totalSpent,
                  remainingBudget, upcomingEvents
                });
              }
            }
          } else {
            if (isActive) setWedding(null);
          }
        } catch (error) {
          console.error("Failed to fetch dashboard data", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      }

      fetchDashboardData();
      return () => { isActive = false; };
    }, [db])
  );

  if (isLoading) {
    return (
      <ScreenContainer style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!wedding) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Ionicons name="rose" size={64} color={theme.colors.primary} />}
          title={t('home.createWedding')}
          description={t('home.createWeddingDesc')}
          actionLabel={t('onboard.createNew')}
          onAction={() => router.push('/auth/join')}
        />
      </ScreenContainer>
    );
  }

  const daysUntil = getDaysUntil(wedding.date);
  const totalCount = stats.guestCount + stats.roomCount + stats.eventCount + stats.vendorCount;
  const isBrandNew = totalCount === 0;
  const s = getDynamicStyles(theme);
  const formatMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  // ─── RENDER FUNCTIONS ───

  const renderHeroSection = () => (
    <View style={[s.heroSection, { paddingTop: insets.top + 16 }]}>
      <View style={s.heroBackground} />
      
      {/* Top bar — notification only, no settings gear */}
      <View style={s.topBar}>
        <View style={{ width: 40 }} />
        <HeaderNotificationIcon tintColor="#FFFFFF" />
      </View>
      
      {/* Couple Name */}
      <View style={s.coupleHero}>
        <View style={s.coupleTextContainer}>
          <Typography variant="display" weight="heavy" style={s.heroText}>
            {wedding.bride_name.split(' ')[0]}
          </Typography>
          <Typography variant="display" weight="heavy" style={s.heroTextAmp}>
            &
          </Typography>
          <Typography variant="display" weight="heavy" style={s.heroText}>
            {wedding.groom_name.split(' ')[0]}
          </Typography>
        </View>
      </View>

      {/* Countdown Card Floating */}
      <View style={s.floatingCountdown}>
        <View style={s.countdownInner}>
          <View style={s.countdownBox}>
             <Ionicons name="calendar" size={20} color={theme.colors.primary} />
             <Typography variant="body" weight="semibold" style={s.countdownLabel}>
               {daysUntil !== null && daysUntil >= 0 ? `${daysUntil} Days Left` : 'Happily Ever After'}
             </Typography>
          </View>
          <View style={s.venueBox}>
            <Ionicons name="location" size={20} color={theme.colors.accent} />
            <Typography variant="caption" weight="medium" color={theme.colors.textSecondary} numberOfLines={1}>
              {wedding.venue || 'No Venue Set'}
            </Typography>
          </View>
        </View>
      </View>
    </View>
  );

  const renderQuickAction = (iconName: keyof typeof Ionicons.glyphMap, label: string, route: any, gradient: string[]) => (
    <Pressable 
      style={({ pressed }) => [s.quickActionCard, pressed && s.pressedState]}
      onPress={() => router.push(route)}
    >
      <View style={[s.quickActionIconBg, { backgroundColor: gradient[0] }]}>
        <Ionicons name={iconName} size={28} color={gradient[1]} />
      </View>
      <Typography variant="caption" weight="bold" style={s.quickActionText}>{label}</Typography>
    </Pressable>
  );

  const renderStatsDashboard = () => (
    <View style={s.statsGrid}>
      {[
        { label: 'Guests', value: stats.totalPeople, icon: 'people', color: theme.colors.primary, bg: theme.colors.cardRose, sub: `${stats.guestCount} families` },
        { label: 'Events', value: stats.eventCount, icon: 'calendar', color: theme.colors.success, bg: theme.colors.cardGreen, sub: '' },
        { label: 'Vendors', value: stats.vendorCount, icon: 'briefcase', color: theme.colors.accent, bg: theme.colors.cardGold, sub: '' },
        { label: 'Rooms', value: stats.roomCount, icon: 'bed', color: theme.colors.gradientEnd, bg: theme.colors.cardPurple, sub: '' },
      ].map((stat, i) => (
        <View key={i} style={[s.statDashCard, { backgroundColor: stat.bg }]}>
          <Ionicons name={stat.icon as any} size={24} color={stat.color} style={{ marginBottom: 8 }} />
          <Typography variant="screenTitle" weight="heavy" color={stat.color}>{stat.value}</Typography>
          <Typography variant="caption" weight="medium" color={theme.colors.textSecondary}>{stat.label}</Typography>
          {stat.sub ? <Typography variant="caption" color={theme.colors.textMuted} style={{ marginTop: 2 }}>{stat.sub}</Typography> : null}
        </View>
      ))}
    </View>
  );

  const renderFinanceCard = () => (
    <Pressable onPress={() => router.push('/(tabs)/finance')} style={({ pressed }) => [pressed && s.pressedState]}>
      <Card style={s.financeCard}>
        <View style={s.financeHeader}>
          <View style={s.financeIconBg}>
            <Ionicons name="wallet" size={22} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Typography variant="body" weight="bold">Finance Overview</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>
              {stats.totalBudget !== null ? `Budget: ${formatMoney(stats.totalBudget)}` : 'No budget set'}
            </Typography>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </View>
        
        <View style={s.financeStatsRow}>
          <View style={s.financeStat}>
            <Typography variant="caption" color={theme.colors.textSecondary}>Spent</Typography>
            <Typography variant="body" weight="bold" color={theme.colors.text}>{formatMoney(stats.totalSpent)}</Typography>
          </View>
          {stats.remainingBudget !== null && (
            <View style={[s.financeStat, { alignItems: 'flex-end' }]}>
              <Typography variant="caption" color={theme.colors.textSecondary}>Remaining</Typography>
              <Typography variant="body" weight="bold" color={stats.remainingBudget < 0 ? theme.colors.error : theme.colors.success}>
                {stats.remainingBudget < 0 ? `-${formatMoney(Math.abs(stats.remainingBudget))}` : formatMoney(stats.remainingBudget)}
              </Typography>
            </View>
          )}
          {stats.pendingPayments > 0 && (
            <View style={[s.financeStat, { alignItems: 'flex-end' }]}>
              <Typography variant="caption" color={theme.colors.textSecondary}>Pending</Typography>
              <Typography variant="body" weight="bold" color={theme.colors.warning}>{stats.pendingPayments} vendors</Typography>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );

  const renderUpcomingEvents = () => {
    if (stats.upcomingEvents.length === 0) return null;
    return (
      <View style={s.section}>
        <Typography variant="sectionTitle" weight="heavy" style={{ marginBottom: 12 }}>Upcoming Events</Typography>
        {stats.upcomingEvents.map((event: any, i: number) => (
          <Pressable 
            key={event.id || i} 
            style={({ pressed }) => [s.eventCard, pressed && s.pressedState]}
            onPress={() => router.push(`/(tabs)/events/${event.id}` as any)}
          >
            <View style={[s.eventDot, { backgroundColor: theme.colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Typography variant="body" weight="semibold">{event.name}</Typography>
              <View style={s.eventMeta}>
                {event.date && (
                  <View style={s.eventMetaItem}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                    <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>{event.date}</Typography>
                  </View>
                )}
                {event.start_time && (
                  <View style={s.eventMetaItem}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                    <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>{event.start_time}</Typography>
                  </View>
                )}
                {event.location && (
                  <View style={s.eventMetaItem}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                    <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>{event.location}</Typography>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']} style={{ backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        
        {renderHeroSection()}

        <View style={s.mainContent}>
          {/* Quick Actions Array */}
          <View style={s.quickActionsContainer}>
            {renderQuickAction("person-add", "Add Guest", "/(tabs)/guests", [theme.colors.cardRose, theme.colors.primary])}
            {renderQuickAction("mail-open", "Patrika", "/(tabs)/patrika", [theme.colors.cardPurple, theme.colors.gradientEnd])}
            {renderQuickAction("bed", "Rooms", "/(tabs)/rooms", [theme.colors.cardGold, theme.colors.accent])}
            {renderQuickAction("calendar", "Events", "/(tabs)/events", [theme.colors.cardGreen, theme.colors.success])}
          </View>

          {/* AI Assistant Banner */}
          <Pressable 
            style={({pressed}) => [s.aiBanner, pressed && s.pressedState]} 
            onPress={() => router.push('/(tabs)/assistant')}
          >
            <View style={s.aiBannerContent}>
              <Typography variant="body" weight="heavy" color="#FFFFFF">Evento AI Assistant</Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.8)">Your personal wedding planner</Typography>
            </View>
            <View style={s.aiIconWrapper}>
              <Ionicons name="sparkles" size={24} color={theme.colors.primary} />
            </View>
          </Pressable>

          {/* Finance Overview Card */}
          {renderFinanceCard()}

          {/* Stats Dashboard */}
          {!isBrandNew && (
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <Typography variant="sectionTitle" weight="heavy">Dashboard</Typography>
                <SyncStatusBadge />
              </View>
              {renderStatsDashboard()}
            </View>
          )}

          {/* Upcoming Events */}
          {renderUpcomingEvents()}

          {/* Needs Attention */}
          {(stats.unassignedGuests > 0 || stats.pendingPayments > 0) && (
             <View style={s.section}>
               <Typography variant="sectionTitle" weight="heavy" style={{ marginBottom: 12 }}>Needs Attention</Typography>
               {stats.unassignedGuests > 0 && (
                 <Pressable style={s.alertCard} onPress={() => router.push('/(tabs)/rooms')}>
                   <Ionicons name="alert-circle" size={24} color={theme.colors.warning} />
                   <Typography variant="body" weight="semibold" style={s.alertText}>
                     {stats.unassignedGuests} Guests need rooms
                   </Typography>
                   <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                 </Pressable>
               )}
               {stats.pendingPayments > 0 && (
                 <Pressable style={[s.alertCard, { marginTop: 8 }]} onPress={() => router.push('/(tabs)/finance')}>
                   <Ionicons name="card" size={24} color={theme.colors.error} />
                   <Typography variant="body" weight="semibold" style={s.alertText}>
                     {stats.pendingPayments} Vendor payments pending
                   </Typography>
                   <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                 </Pressable>
               )}
             </View>
          )}

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// Let inline styles use the dynamic theme
const getDynamicStyles = (theme: any) => StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 120 },
  
  // ─── PREMIUM HERO ───
  heroSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 60,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    position: 'relative',
  },
  heroBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.primaryDark,
    opacity: 0.2,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  coupleHero: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  coupleTextContainer: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
  },
  heroText: {
    color: '#FFFFFF', fontSize: 36, letterSpacing: -1,
  },
  heroTextAmp: {
    color: theme.colors.accent, fontSize: 42,
  },

  // ─── FLOATING COUNTDOWN ───
  floatingCountdown: {
    position: 'absolute',
    bottom: -30,
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    ...theme.shadows.lg,
  },
  countdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  countdownBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingRight: theme.spacing.md, borderRightWidth: 1, borderColor: theme.colors.borderLight,
  },
  venueBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingLeft: theme.spacing.md,
  },
  countdownLabel: { color: theme.colors.text },

  // ─── MAIN CONTENT ───
  mainContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 50,
  },
  pressedState: { opacity: 0.8 },

  // ─── QUICK ACTIONS ───
  quickActionsContainer: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xl,
  },
  quickActionCard: {
    alignItems: 'center', gap: 8,
  },
  quickActionIconBg: {
    width: 64, height: 64, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.sm,
  },
  quickActionText: { color: theme.colors.textSecondary },

  // ─── AI BANNER ───
  aiBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl, padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  aiBannerContent: { flex: 1 },
  aiIconWrapper: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── FINANCE CARD ───
  financeCard: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  financeHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md,
  },
  financeIconBg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.cardGold,
    justifyContent: 'center', alignItems: 'center',
  },
  financeStatsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
  },
  financeStat: {
    flex: 1,
  },

  // ─── DASHBOARD ───
  section: { marginBottom: theme.spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md,
  },
  statDashCard: {
    width: (SCREEN_WIDTH - 2 * theme.spacing.xl - theme.spacing.md) / 2,
    padding: theme.spacing.lg, borderRadius: theme.radii.xl,
    ...theme.shadows.sm,
  },

  // ─── UPCOMING EVENTS ───
  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg, borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  eventDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: 12,
  },
  eventMeta: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4,
  },
  eventMetaItem: {
    flexDirection: 'row', alignItems: 'center',
  },

  // ─── ALERTS ───
  alertCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface, padding: theme.spacing.lg,
    borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  alertText: { flex: 1, marginLeft: theme.spacing.md },
});
