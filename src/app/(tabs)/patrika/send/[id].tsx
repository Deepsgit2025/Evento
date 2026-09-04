import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Button, ListItem } from '../../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme/ThemeContext';
import { spacing, radii } from '../../../../theme';
import { PatrikaService } from '../../../../services/patrika';
import { GuestService } from '../../../../services/guest';
import { GroupService } from '../../../../services/group';
import { EventService } from '../../../../services/event';
import { AuthService } from '../../../../services/auth';
import { getUserWedding } from '../../../../services/wedding';
import { Guest, Event, GuestGroup, InvitationRecipient } from '../../../../database/types';

export default function SendPatrikaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [existingRecipients, setExistingRecipients] = useState<InvitationRecipient[]>([]);

  const [selectedEventId, setSelectedEventId] = useState<string>('MAIN');
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding) return;

        const [gList, grpList, evList, recs] = await Promise.all([
          GuestService.getGuests(db, wedding.id),
          GroupService.getGroups(db, wedding.id, 'All'),
          EventService.getEvents(db, wedding.id),
          PatrikaService.getRecipientsForInvitation(db, id)
        ]);

        setGuests(gList);
        setGroups(grpList);
        setEvents(evList);
        setExistingRecipients(recs);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [db, id]);

  const toggleGuest = (guestId: string) => {
    const next = new Set(selectedGuestIds);
    if (next.has(guestId)) {
      next.delete(guestId);
    } else {
      next.add(guestId);
    }
    setSelectedGuestIds(next);
  };

  const selectAll = () => setSelectedGuestIds(new Set(guests.map(g => g.id)));
  const selectSide = (side: 'Groom' | 'Bride') => {
    const next = new Set(selectedGuestIds);
    guests.filter(g => g.side === side).forEach(g => next.add(g.id));
    setSelectedGuestIds(next);
  };
  const selectGroup = (groupId: string) => {
    const next = new Set(selectedGuestIds);
    guests.filter(g => g.group_id === groupId).forEach(g => next.add(g.id));
    setSelectedGuestIds(next);
  };
  const clearSelection = () => setSelectedGuestIds(new Set());

  const handleQueue = async () => {
    if (selectedGuestIds.size === 0) {
      Alert.alert('No Guests Selected', 'Please select at least one guest.');
      return;
    }

    const eventIdForDb = selectedEventId === 'MAIN' ? null : selectedEventId;

    try {
      const added = await PatrikaService.addRecipients(db, id, Array.from(selectedGuestIds), eventIdForDb);
      Alert.alert('Success', `Queued invitation for ${added} guests.`);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to queue guests.');
    }
  };

  if (isLoading) return null;

  return (
    <ScreenContainer>
      <ScrollView>
        <View style={[styles.section, { borderBottomColor: theme.colors.borderLight }]}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>1. Which Event is this for?</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventSelection}>
            <Button 
              label="Main Wedding" 
              variant={selectedEventId === 'MAIN' ? 'primary' : 'outline'} 
              onPress={() => setSelectedEventId('MAIN')} 
              style={styles.eventBtn} 
            />
            {events.map(ev => (
              <Button 
                key={ev.id}
                label={ev.name} 
                variant={selectedEventId === ev.id ? 'primary' : 'outline'} 
                onPress={() => setSelectedEventId(ev.id)} 
                style={styles.eventBtn} 
              />
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { borderBottomColor: theme.colors.borderLight }]}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>2. Select Recipients</Typography>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
            <Button label="Select All" variant="secondary" onPress={selectAll} style={styles.filterBtn} />
            <Button label="Clear" variant="outline" onPress={clearSelection} style={styles.filterBtn} />
            <Button label="Groom Side" variant="secondary" onPress={() => selectSide('Groom')} style={styles.filterBtn} />
            <Button label="Bride Side" variant="secondary" onPress={() => selectSide('Bride')} style={styles.filterBtn} />
            {groups.map(g => (
              <Button key={g.id} label={g.name} variant="outline" onPress={() => selectGroup(g.id)} style={styles.filterBtn} />
            ))}
          </ScrollView>

          <View style={[styles.guestList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
            {guests.map(guest => {
              const eventDbId = selectedEventId === 'MAIN' ? null : selectedEventId;
              const alreadyHas = existingRecipients.some(r => r.guest_id === guest.id && r.event_id === eventDbId);
              const isSelected = selectedGuestIds.has(guest.id);

              return (
                <Pressable
                  key={guest.id}
                  style={[
                    styles.guestItem,
                    { borderBottomColor: theme.colors.borderLight },
                    isSelected && { backgroundColor: theme.colors.primary + '10' },
                    alreadyHas && { backgroundColor: theme.colors.background, opacity: 0.6 }
                  ]}
                  onPress={() => {
                    if (alreadyHas) {
                      Alert.alert('Already Assigned', 'This guest has already been assigned this invitation for this event.');
                      return;
                    }
                    toggleGuest(guest.id);
                  }}
                >
                  <View style={[styles.checkbox, { borderColor: theme.colors.border }]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    {alreadyHas && <Ionicons name="checkmark-circle" size={16} color={theme.colors.border} />}
                  </View>
                  <View style={styles.guestInfo}>
                    <Typography variant="body" weight="medium">{guest.full_name}</Typography>
                    <Typography variant="caption" color={theme.colors.textSecondary}>{guest.side}</Typography>
                  </View>
                  {alreadyHas && (
                    <Typography variant="caption" color={theme.colors.error}>Already added</Typography>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderLight }]}>
        <Button
          label={`Queue ${selectedGuestIds.size} Guests`}
          onPress={handleQueue}
          disabled={selectedGuestIds.size === 0}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  eventSelection: {
    flexDirection: 'row',
  },
  eventBtn: {
    marginRight: spacing.sm,
  },
  quickFilters: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  filterBtn: {
    marginRight: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  guestList: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  guestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  guestInfo: {
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  }
});
