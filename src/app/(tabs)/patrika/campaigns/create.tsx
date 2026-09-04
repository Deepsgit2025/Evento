import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Button, TextInput } from '../../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { WhatsAppService } from '../../../../services/whatsapp';
import { PatrikaService } from '../../../../services/patrika';
import { GuestService } from '../../../../services/guest';
import { GroupService } from '../../../../services/group';
import { EventService } from '../../../../services/event';
import { AuthService } from '../../../../services/auth';
import { getUserWedding } from '../../../../services/wedding';
import { Guest, Event, GuestGroup, Invitation } from '../../../../database/types';

export default function CreateCampaignScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [isLoading, setIsLoading] = useState(true);
  const [weddingId, setWeddingId] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [campaignName, setCampaignName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('MAIN');
  const [selectedPatrikaId, setSelectedPatrikaId] = useState<string | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding) return;
        
        setWeddingId(wedding.id);

        const [gList, grpList, evList, invList] = await Promise.all([
          GuestService.getGuests(db, wedding.id),
          GroupService.getGroups(db, wedding.id, 'All'),
          EventService.getEvents(db, wedding.id),
          PatrikaService.getInvitationsForWedding(db, wedding.id)
        ]);

        setGuests(gList);
        setGroups(grpList);
        setEvents(evList);
        setInvitations(invList);
        if (invList.length > 0) {
          setSelectedPatrikaId(invList[0].id);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [db]);

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

  const handleLaunch = async () => {
    if (!campaignName.trim()) {
      Alert.alert('Validation Error', 'Please enter a campaign name.');
      return;
    }
    if (!selectedPatrikaId) {
      Alert.alert('Validation Error', 'Please select a Patrika design.');
      return;
    }
    if (selectedGuestIds.size === 0) {
      Alert.alert('Validation Error', 'Please select at least one recipient.');
      return;
    }

    setIsSubmitting(true);
    const eventIdForDb = selectedEventId === 'MAIN' ? null : selectedEventId;

    try {
      // 1. Create Campaign Shell
      const campaign = await WhatsAppService.createCampaign(
        db,
        weddingId,
        selectedPatrikaId,
        campaignName.trim()
      );

      // 2. Queue Recipients to normal Patrika System (handles unique constraints)
      const guestArray = Array.from(selectedGuestIds);
      await PatrikaService.addRecipients(db, selectedPatrikaId, guestArray, eventIdForDb);

      // 3. We need to associate those newly queued records with this campaign
      // Fetch the specific recipient records we just created
      const allRecs = await PatrikaService.getRecipientsForInvitation(db, selectedPatrikaId);
      const newlyAddedRecs = allRecs.filter(r => 
        r.event_id === eventIdForDb && 
        guestArray.includes(r.guest_id) && 
        (r.campaign_id === null || r.campaign_id === campaign.id)
      );

      const recIds = newlyAddedRecs.map(r => r.id);
      await WhatsAppService.assignRecipientsToCampaign(db, campaign.id, recIds);

      Alert.alert('Campaign Created', `Successfully created campaign with ${recIds.length} recipients.`);
      router.replace(`/(tabs)/patrika/campaigns/${campaign.id}` as any);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create campaign.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <ScreenContainer>
      <ScrollView>
        <View style={styles.section}>
          <TextInput
            label="Campaign Name"
            placeholder="e.g., Mehndi Invites - Bride Side"
            value={campaignName}
            onChangeText={setCampaignName}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Select Patrika</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hSelection}>
            {invitations.map(inv => (
              <Button 
                key={inv.id}
                label={inv.title} 
                variant={selectedPatrikaId === inv.id ? 'primary' : 'outline'} 
                onPress={() => setSelectedPatrikaId(inv.id)} 
                style={styles.btn} 
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Select Event</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hSelection}>
            <Button 
              label="Main Wedding" 
              variant={selectedEventId === 'MAIN' ? 'primary' : 'outline'} 
              onPress={() => setSelectedEventId('MAIN')} 
              style={styles.btn} 
            />
            {events.map(ev => (
              <Button 
                key={ev.id}
                label={ev.name} 
                variant={selectedEventId === ev.id ? 'primary' : 'outline'} 
                onPress={() => setSelectedEventId(ev.id)} 
                style={styles.btn} 
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Select Recipients</Typography>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
            <Button label="Select All" variant="secondary" onPress={selectAll} style={styles.btn} />
            <Button label="Clear" variant="outline" onPress={clearSelection} style={styles.btn} />
            <Button label="Groom Side" variant="secondary" onPress={() => selectSide('Groom')} style={styles.btn} />
            <Button label="Bride Side" variant="secondary" onPress={() => selectSide('Bride')} style={styles.btn} />
            {groups.map(g => (
              <Button key={g.id} label={g.name} variant="outline" onPress={() => selectGroup(g.id)} style={styles.btn} />
            ))}
          </ScrollView>

          <View style={styles.guestList}>
            {guests.map(guest => {
              const isSelected = selectedGuestIds.has(guest.id);

              return (
                <Pressable 
                  key={guest.id} 
                  style={[
                    styles.guestItem, 
                    isSelected && styles.guestItemSelected
                  ]}
                  onPress={() => toggleGuest(guest.id)}
                >
                  <View style={styles.checkbox}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={styles.guestInfo}>
                    <Typography variant="body" weight="medium">{guest.full_name}</Typography>
                    <Typography variant="caption" color={theme.colors.textSecondary}>{guest.side}</Typography>
                  </View>
                  {!guest.phone && (
                    <Typography variant="caption" color={theme.colors.error}>No Phone #</Typography>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          label={`Review Campaign (${selectedGuestIds.size})`}
          onPress={handleLaunch}
          disabled={selectedGuestIds.size === 0 || isSubmitting}
          isLoading={isSubmitting}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  hSelection: {
    flexDirection: 'row',
  },
  quickFilters: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  btn: {
    marginRight: theme.spacing.sm,
  },
  guestList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  guestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  guestItemSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  guestInfo: {
    flex: 1,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  }
});
