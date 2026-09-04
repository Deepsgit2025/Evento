import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, ListItem, SmartSuggestionBanner } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { EventService } from '../../../services/event';
import { VendorEventService } from '../../../services/vendorEvent';
import { EventGuestService } from '../../../services/eventGuest';
import { ReminderService, Reminder } from '../../../services/reminder';
import { Event, Vendor, Guest } from '../../../database/types';
import { getEventCountdown } from '../../../utils/date';

export default function EventProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();

  const [event, setEvent] = useState<Event | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [unassignedVendors, setUnassignedVendors] = useState<Vendor[]>([]);
  const [guests, setGuests] = useState<(Guest & { participation_id: string, event_rsvp_status: string })[]>([]);
  
  const [countdown, setCountdown] = useState<any>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchEventData = useCallback(async () => {
    if (!id) return;
    try {
      const e = await EventService.getEventById(db, id);
      if (e) {
        setEvent(e);
        const [assigned, unassigned, attending] = await Promise.all([
          VendorEventService.getVendorsForEvent(db, id),
          VendorEventService.getUnassignedVendorsForEvent(db, e.wedding_id, id),
          EventGuestService.getGuestsForEvent(db, id)
        ]);
        setVendors(assigned);
        setUnassignedVendors(unassigned);
        setGuests(attending);
      }
    } catch (e) {
      console.error("Failed to fetch event data", e instanceof Error ? e.message : String(e));
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      fetchEventData();
    }, [fetchEventData])
  );

  useEffect(() => {
    if (event) {
      setCountdown(getEventCountdown(event.date, event.start_time, event.end_time));
    }
  }, [event, tick]);

  const handleDelete = () => {
    Alert.alert(
      "Delete this event?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (id) {
              await EventService.deleteEvent(db, id);
              router.back();
            }
          }
        }
      ]
    );
  };

  const handleAssignVendor = async (vendorId: string) => {
    try {
      await VendorEventService.assignVendorToEvent(db, vendorId, id);
      fetchEventData();
    } catch (e) {
      Alert.alert('Error', 'Could not assign vendor.');
    }
  };

  const handleUnassignVendor = async (vendorId: string) => {
    try {
      await VendorEventService.unassignVendorFromEvent(db, vendorId, id);
      fetchEventData();
    } catch (e) {
      Alert.alert('Error', 'Could not unassign vendor.');
    }
  };

  const handleRemoveGuest = async (guestId: string) => {
    try {
      await EventGuestService.removeGuest(db, id as string, guestId);
      fetchEventData();
    } catch (e) {
      Alert.alert('Error', 'Could not remove guest.');
    }
  };

  const handleAddReminder = async (suggestion: Partial<Reminder>) => {
    try {
      await ReminderService.createReminder(db, suggestion as Omit<Reminder, 'id' | 'status' | 'notification_id' | 'created_at' | 'updated_at'>);
      Alert.alert('Success', 'Reminder scheduled.');
    } catch (e) {
      Alert.alert('Error', 'Could not set reminder.');
    }
  };

  if (!event) {
    return (
      <ScreenContainer style={styles.center}>
        <Typography variant="body" color={theme.colors.textMuted}>Loading event...</Typography>
      </ScreenContainer>
    );
  }

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            <Typography variant="body" color={theme.colors.primary}>Back</Typography>
          </Pressable>
          <Pressable onPress={() => router.push(`/(tabs)/events/add?editId=${event.id}` as any)}>
            <Typography variant="body" weight="semibold" color={theme.colors.primary}>Edit</Typography>
          </Pressable>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="calendar-outline" size={40} color={theme.colors.surface} />
          </View>
          <Typography variant="screenTitle" style={styles.name}>{event.name}</Typography>
          
          <View style={styles.badgesRow}>
            {event.event_type && (
              <View style={[styles.badge, styles.badgeType]}>
                <Typography variant="caption" weight="medium" style={styles.badgeTextType}>{event.event_type}</Typography>
              </View>
            )}
            {countdown && (
              <View style={[styles.badge, countdown.isPast ? styles.badgePast : styles.badgeFuture]}>
                <Typography variant="caption" weight="medium" style={countdown.isPast ? styles.badgeTextPast : styles.badgeTextFuture}>
                  {countdown.label}
                </Typography>
              </View>
            )}
          </View>
        </View>

        <SmartSuggestionBanner 
          type="EVENT" 
          entityId={event.id} 
          weddingId={event.wedding_id} 
          contextData={event} 
          onAddReminder={handleAddReminder} 
        />

        <Card style={styles.card}>
          <Typography variant="sectionTitle" style={styles.cardTitle}>Details</Typography>
          
          {event.date && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.detailIcon} />
              <View>
                <Typography variant="caption" color={theme.colors.textSecondary}>Date</Typography>
                <Typography variant="body" weight="medium">{formatDate(event.date)}</Typography>
              </View>
            </View>
          )}

          {(event.start_time || event.end_time) && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} style={styles.detailIcon} />
              <View>
                <Typography variant="caption" color={theme.colors.textSecondary}>Time</Typography>
                <Typography variant="body" weight="medium">
                  {event.start_time ? formatTime(event.start_time) : ''}
                  {event.start_time && event.end_time ? ' - ' : ''}
                  {event.end_time ? formatTime(event.end_time) : ''}
                </Typography>
              </View>
            </View>
          )}

          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} style={styles.detailIcon} />
              <View>
                <Typography variant="caption" color={theme.colors.textSecondary}>Location / Venue</Typography>
                <Typography variant="body" weight="medium">{event.location}</Typography>
              </View>
            </View>
          )}

          {event.description && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} style={styles.detailIcon} />
              <View>
                <Typography variant="caption" color={theme.colors.textSecondary}>Description / Notes</Typography>
                <Typography variant="body" weight="medium">{event.description}</Typography>
              </View>
            </View>
          )}
        </Card>

        {/* Guests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Typography variant="sectionTitle" style={styles.sectionTitle}>Attending Guests</Typography>
            <Button 
              label="Manage Guests" 
              variant="outline"
              onPress={() => router.push(`/(tabs)/events/${event.id}/manage-guests`)}
              style={styles.manageBtn}
            />
          </View>
          
          {guests.length > 0 && (
            <Typography variant="caption" color={theme.colors.textSecondary} style={{marginBottom: theme.spacing.md}}>
              {guests.length} {guests.length === 1 ? 'record' : 'records'} · {guests.reduce((acc, g) => acc + g.party_size, 0)} people
            </Typography>
          )}

          {guests.length > 0 ? (
            <Card style={styles.listCard}>
              {guests.slice(0, 5).map(guest => (
                <ListItem 
                  key={guest.id}
                  title={guest.full_name}
                  subtitle={`Party of ${guest.party_size} · ${guest.side} Side`}
                  leftElement={<Ionicons name="person" size={20} color={theme.colors.primary} />}
                  rightElement={
                    <TouchableOpacity onPress={() => handleRemoveGuest(guest.id)}>
                      <Ionicons name="remove-circle-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  }
                />
              ))}
              {guests.length > 5 && (
                <View style={{padding: theme.spacing.md, alignItems: 'center'}}>
                  <Typography variant="body" color={theme.colors.textSecondary}>
                    + {guests.length - 5} more guests
                  </Typography>
                </View>
              )}
            </Card>
          ) : (
            <Typography variant="body" color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing.md }}>
              No guests assigned yet.
            </Typography>
          )}
        </View>

        {/* Vendors Section */}
        <View style={styles.section}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Assigned Vendors</Typography>
          {vendors.length > 0 ? (
            <Card style={styles.listCard}>
              {vendors.map(vendor => (
                <ListItem 
                  key={vendor.id}
                  title={vendor.name}
                  subtitle={vendor.category}
                  leftElement={<Ionicons name="briefcase-outline" size={20} color={theme.colors.primary} />}
                  rightElement={
                    <TouchableOpacity onPress={() => handleUnassignVendor(vendor.id)}>
                      <Ionicons name="remove-circle-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  }
                />
              ))}
            </Card>
          ) : (
            <Typography variant="body" color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing.md }}>
              No vendors assigned yet.
            </Typography>
          )}

          {unassignedVendors.length > 0 && (
            <Card style={[styles.listCard, { marginTop: theme.spacing.sm }]}>
              <View style={{ padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated }}>
                <Typography variant="body" weight="medium">Assign vendors</Typography>
              </View>
              {unassignedVendors.map(vendor => (
                <ListItem 
                  key={vendor.id}
                  title={vendor.name}
                  subtitle={vendor.category}
                  rightElement={
                    <TouchableOpacity onPress={() => handleAssignVendor(vendor.id)}>
                      <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  }
                />
              ))}
            </Card>
          )}
        </View>

        <Button 
          label="Delete Event" 
          variant="outline"
          onPress={handleDelete}
          style={styles.deleteButton}
        />
        
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  name: {
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
  },
  badgeType: {
    backgroundColor: '#F3E8FF', // Light purple
  },
  badgeTextType: {
    color: '#7E22CE', // Dark purple
  },
  badgePast: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  badgeTextPast: {
    color: theme.colors.textSecondary,
  },
  badgeFuture: {
    backgroundColor: '#F0FDF4', // Light green
  },
  badgeTextFuture: {
    color: theme.colors.primary,
  },
  card: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  detailIcon: {
    width: 40, 
  },
  deleteButton: {
    marginTop: theme.spacing.xl,
    borderColor: theme.colors.error,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  manageBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  }
});
