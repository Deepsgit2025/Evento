import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card, Button } from '../../components/ui';
import { theme } from '../../theme';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { ReportGenerators } from '../../services/reportGenerators';
import { 
  ReportService, 
  FinancialReport, 
  GuestReport, 
  RoomReport, 
  EventReport 
} from '../../services/report';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const db = useSQLiteContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [guest, setGuest] = useState<GuestReport | null>(null);
  const [room, setRoom] = useState<RoomReport | null>(null);
  const [event, setEvent] = useState<EventReport | null>(null);
  
  const [weddingName, setWeddingName] = useState<string>('Wedding Report');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [currentWeddingId, setCurrentWeddingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      setWeddingName(`${wedding.groom_name} & ${wedding.bride_name}'s Wedding`);
      setCurrentWeddingId(wedding.id);

      const [fin, gst, rm, evt] = await Promise.all([
        ReportService.getFinancialReport(db, wedding.id),
        ReportService.getGuestReport(db, wedding.id),
        ReportService.getRoomReport(db, wedding.id),
        ReportService.getEventReport(db, wedding.id)
      ]);

      setFinancial(fin);
      setGuest(gst);
      setRoom(rm);
      setEvent(evt);
    } catch (e) {
      console.error("Failed to fetch reports:", e instanceof Error ? e.message : String(e));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const renderKPI = (title: string, value: string, icon: string, color: string = theme.colors.primary) => (
    <View style={styles.kpiContainer}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Typography variant="body" weight="bold" style={styles.kpiValue}>{value}</Typography>
      <Typography variant="caption" color={theme.colors.textSecondary} style={{ textAlign: 'center' }}>{title}</Typography>
    </View>
  );

  const renderFinancial = () => {
    if (!financial) return null;
    return (
      <View style={styles.section}>
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Financial Summary</Typography>
        <Card>
          <View style={styles.kpiGrid}>
            {renderKPI('Overall Spent', `₹${financial.overall_spending.toLocaleString()}`, 'card', theme.colors.error)}
            {renderKPI('Pending Payments', `₹${financial.total_pending.toLocaleString()}`, 'alert-circle', theme.colors.warning)}
          </View>
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <Typography variant="body" color={theme.colors.textSecondary}>Vendor Agreements</Typography>
            <Typography variant="body" weight="medium">₹{financial.total_agreed.toLocaleString()}</Typography>
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Typography variant="body" color={theme.colors.textSecondary}>Vendor Payments</Typography>
            <Typography variant="body" weight="medium" color={theme.colors.success}>₹{financial.total_vendor_payments.toLocaleString()}</Typography>
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Typography variant="body" color={theme.colors.textSecondary}>General Expenses</Typography>
            <Typography variant="body" weight="medium">₹{financial.general_expenses.toLocaleString()}</Typography>
          </View>
        </Card>
      </View>
    );
  };

  const renderGuests = () => {
    if (!guest) return null;
    return (
      <View style={styles.section}>
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Guest Summary</Typography>
        <Card>
          <View style={styles.kpiGrid}>
            {renderKPI('Total Guests', guest.total_guests.toString(), 'people', theme.colors.primary)}
            {renderKPI('Needs Room', guest.guests_without_rooms.toString(), 'bed-outline', guest.guests_without_rooms > 0 ? theme.colors.warning : theme.colors.success)}
            {renderKPI('No Invite', guest.guests_without_invitations.toString(), 'mail-outline', guest.guests_without_invitations > 0 ? theme.colors.warning : theme.colors.success)}
          </View>
          <View style={styles.divider} />
          <View style={styles.progressContainer}>
            <View style={styles.rowBetween}>
              <Typography variant="caption" color={theme.colors.textSecondary}>Bride Side ({guest.bride_side})</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>Groom Side ({guest.groom_side})</Typography>
            </View>
            <View style={styles.barBackground}>
              <View style={[
                styles.barFill, 
                { width: guest.total_guests ? `${(guest.bride_side / guest.total_guests) * 100}%` : '50%', backgroundColor: '#EC4899' } // Pink
              ]} />
              <View style={[
                styles.barFill, 
                { width: guest.total_guests ? `${(guest.groom_side / guest.total_guests) * 100}%` : '50%', backgroundColor: '#3B82F6' } // Blue
              ]} />
            </View>
          </View>
          
          <Typography variant="caption" weight="medium" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>RSVP Status</Typography>
          <View style={styles.rsvpGrid}>
            <View style={styles.rsvpItem}>
              <Typography variant="caption" color={theme.colors.success}>Attending</Typography>
              <Typography variant="body" weight="bold">{guest.rsvp_states.ATTENDING}</Typography>
            </View>
            <View style={styles.rsvpItem}>
              <Typography variant="caption" color={theme.colors.warning}>Pending</Typography>
              <Typography variant="body" weight="bold">{guest.rsvp_states.PENDING}</Typography>
            </View>
            <View style={styles.rsvpItem}>
              <Typography variant="caption" color={theme.colors.textSecondary}>Maybe</Typography>
              <Typography variant="body" weight="bold">{guest.rsvp_states.MAYBE}</Typography>
            </View>
            <View style={styles.rsvpItem}>
              <Typography variant="caption" color={theme.colors.error}>Declined</Typography>
              <Typography variant="body" weight="bold">{guest.rsvp_states.DECLINED}</Typography>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const renderRooms = () => {
    if (!room) return null;
    return (
      <View style={styles.section}>
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Accommodation</Typography>
        <Card>
          <View style={styles.kpiGrid}>
            {renderKPI('Total Rooms', room.total_rooms.toString(), 'key', theme.colors.primary)}
            {renderKPI('Occupied', room.occupied_rooms.toString(), 'lock-closed', theme.colors.success)}
            {renderKPI('Available', room.available_rooms.toString(), 'lock-open', theme.colors.warning)}
          </View>
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <Typography variant="body" color={theme.colors.textSecondary}>Guests Assigned to Rooms</Typography>
            <Typography variant="body" weight="medium">{room.guests_assigned}</Typography>
          </View>
        </Card>
      </View>
    );
  };

  const renderEvents = () => {
    if (!event) return null;
    return (
      <View style={styles.section}>
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Events</Typography>
        <Card>
          <View style={styles.kpiGrid}>
            {renderKPI('Upcoming', event.upcoming_events.toString(), 'calendar', theme.colors.primary)}
            {renderKPI('Completed', event.completed_events.toString(), 'checkmark.circle', theme.colors.success)}
          </View>
          
          {event.guests_per_event.length > 0 && (
            <>
              <View style={styles.divider} />
              <Typography variant="caption" weight="medium" style={{ marginBottom: theme.spacing.sm }}>Guests per Event</Typography>
              {event.guests_per_event.map((e, idx) => (
                <View key={e.event_id} style={[styles.rowBetween, { marginTop: idx === 0 ? 0 : 8 }]}>
                  <Typography variant="body" color={theme.colors.textSecondary}>{e.event_name}</Typography>
                  <Typography variant="body" weight="medium">{e.guest_count}</Typography>
                </View>
              ))}
            </>
          )}

          {event.assigned_vendors.length > 0 && (
            <>
              <View style={styles.divider} />
              <Typography variant="caption" weight="medium" style={{ marginBottom: theme.spacing.sm }}>Vendors per Event</Typography>
              {event.assigned_vendors.map((e, idx) => (
                <View key={e.event_id} style={[styles.rowBetween, { marginTop: idx === 0 ? 0 : 8 }]}>
                  <Typography variant="body" color={theme.colors.textSecondary}>{e.event_name}</Typography>
                  <Typography variant="body" weight="medium">{e.vendor_count}</Typography>
                </View>
              ))}
            </>
          )}
        </Card>
      </View>
    );
  };

  const handleExport = (type: 'Guest List' | 'Room Allocations' | 'Financial Report' | 'Event Schedule', format: 'PDF' | 'CSV') => {
    Alert.alert(
      "Privacy Warning",
      "This report contains sensitive wedding information. Please ensure you only share this with authorized individuals.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Export", 
          onPress: async () => {
            if (!currentWeddingId) return;
            setIsExporting(`${type}_${format}`);
            try {
              if (type === 'Guest List') {
                await ReportGenerators.exportGuestList(db, currentWeddingId, format, weddingName);
              } else if (type === 'Room Allocations') {
                await ReportGenerators.exportRoomAllocations(db, currentWeddingId, format, weddingName);
              } else if (type === 'Financial Report') {
                await ReportGenerators.exportFinancialReport(db, currentWeddingId, format, weddingName);
              } else if (type === 'Event Schedule') {
                await ReportGenerators.exportEventSchedule(db, currentWeddingId, format, weddingName);
              }
            } catch (e) {
              console.error("Export failed", e instanceof Error ? e.message : String(e));
              Alert.alert("Export Error", "An error occurred while generating the report.");
            } finally {
              setIsExporting(null);
            }
          }
        }
      ]
    );
  };

  const renderExportOptions = () => {
    const exportItem = (title: string, type: 'Guest List' | 'Room Allocations' | 'Financial Report' | 'Event Schedule') => (
      <View style={[styles.rowBetween, { marginTop: 16 }]}>
        <Typography variant="body" weight="medium">{title}</Typography>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button 
            variant="outline" 
            label={isExporting === `${type}_CSV` ? "Wait..." : "CSV"}
            disabled={!!isExporting}
            onPress={() => handleExport(type, 'CSV')} 
            style={{ paddingHorizontal: 12, paddingVertical: 6, minWidth: 60 }} 
          />
          <Button 
            variant="primary" 
            label={isExporting === `${type}_PDF` ? "Wait..." : "PDF"}
            disabled={!!isExporting}
            onPress={() => handleExport(type, 'PDF')} 
            style={{ paddingHorizontal: 12, paddingVertical: 6, minWidth: 60 }} 
          />
        </View>
      </View>
    );

    return (
      <View style={styles.section}>
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Export Reports</Typography>
        <Card>
          <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 8 }}>
            Export detailed tables containing all records.
          </Typography>
          {exportItem('Financial Summary & Expenses', 'Financial Report')}
          {exportItem('Guest List & RSVPs', 'Guest List')}
          {exportItem('Room Allocations', 'Room Allocations')}
          {exportItem('Event Schedule', 'Event Schedule')}
        </Card>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Reports</Typography>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderFinancial()}
        {renderGuests()}
        {renderRooms()}
        {renderEvents()}
        {renderExportOptions()}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  kpiContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  kpiValue: {
    fontSize: 18,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceElevated,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 8,
  },
  barFill: {
    height: '100%',
  },
  rsvpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  rsvpItem: {
    alignItems: 'center',
  }
});
