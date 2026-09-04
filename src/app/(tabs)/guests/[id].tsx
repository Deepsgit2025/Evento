import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, ListItem } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { GuestService } from '../../../services/guest';
import { GroupService } from '../../../services/group';
import { RoomAssignmentService } from '../../../services/roomAssignment';
import { PatrikaService } from '../../../services/patrika';
import { EventGuestService } from '../../../services/eventGuest';
import { Guest, GuestGroup, RoomAssignment, InvitationRecipient, Event } from '../../../database/types';

export default function GuestProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const avatarStyle = [styles.avatarPlaceholder, { backgroundColor: theme.colors.border }];
  const badgeGroupStyle = [styles.badge, styles.badgeGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }];
  const badgeTextGroupStyle = [styles.badgeTextGroup, { color: theme.colors.textSecondary }];
  const sectionLabelStyle = [styles.sectionLabel, { color: theme.colors.textSecondary }];
  const sectionBlockStyle = [styles.sectionBlock, { backgroundColor: theme.colors.surface }];
  const listRowBorderStyle = { borderBottomColor: theme.colors.borderLight };
  const badgeSentStyle = { backgroundColor: theme.colors.success };
  const badgeDefaultStyle = { backgroundColor: theme.colors.border };
  const deleteButtonStyle = [styles.deleteButton, { borderColor: theme.colors.error }];

  const [guest, setGuest] = useState<Guest | null>(null);
  const [group, setGroup] = useState<GuestGroup | null>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [invitations, setInvitations] = useState<(InvitationRecipient & { invitation_title: string; template_id: string; event_name: string | null })[]>([]);
  const [events, setEvents] = useState<(Event & { participation_id: string, event_rsvp_status: string })[]>([]);
  const [availablePatrikas, setAvailablePatrikas] = useState<any[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);

  const fetchGuest = async () => {
    if (!id) return;
    try {
      const [guestData, assignmentData, invitationData, eventsData, allPatrikas] = await Promise.all([
        GuestService.getGuestById(db, id as string),
        RoomAssignmentService.getGuestAssignment(db, id as string),
        PatrikaService.getInvitationsForGuest(db, id as string),
        EventGuestService.getEventsForGuest(db, id as string),
        PatrikaService.getInvitationsForWedding(db, (await GuestService.getGuestById(db, id as string))?.wedding_id || '')
      ]);

      if (guestData) {
        setGuest(guestData);
        if (guestData.group_id) {
          const groups = await GroupService.getGroups(db, guestData.wedding_id, 'All');
          setGroup(groups.find(grp => grp.id === guestData.group_id) || null);
        } else {
          setGroup(null);
        }
        setAssignment(assignmentData);
        setInvitations(invitationData);
        setEvents(eventsData);
        setAvailablePatrikas(allPatrikas);
      }
    } catch (e) {
      console.error("Failed to fetch guest", e instanceof Error ? e.message : String(e));
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchGuest();
    }, [id, db])
  );

  const handleDelete = () => {
    Alert.alert(
      "Remove this guest?",
      "Their guest record will be permanently removed from this wedding.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (id) {
              await GuestService.deleteGuest(db, id);
              router.back();
            }
          }
        }
      ]
    );
  };

  if (!guest) {
    return (
      <ScreenContainer style={styles.center}>
        <Typography variant="body" color={theme.colors.textMuted}>Loading guest...</Typography>
      </ScreenContainer>
    );
  }

  const handleSendPatrika = async (patrika: any) => {
    try {
      const custData = patrika.customization_data ? JSON.parse(patrika.customization_data) : {};
      const messageRaw = custData.message || 'We invite you to share our joy';
      let formattedMessage = messageRaw.replace(/{guest name}/gi, guest.full_name).replace(/\n/g, '<br/>');
      
      const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fdfbf7; color: #4a4a4a; text-align: center; padding: 40px; margin: 20px; border: 8px solid #d4af37; border-radius: 12px; }
            .header { color: #800020; font-size: 32px; font-weight: bold; margin-bottom: 10px; letter-spacing: 2px; text-transform: uppercase; }
            .subheader { color: #d4af37; font-size: 20px; font-weight: normal; margin-bottom: 30px; letter-spacing: 1px; }
            .content { font-size: 18px; line-height: 1.8; margin-bottom: 20px; }
            .guest-name { font-size: 26px; font-weight: bold; margin: 25px 0; color: #222; border-bottom: 2px solid #d4af37; display: inline-block; padding-bottom: 5px; font-style: italic; }
            .footer { margin-top: 50px; font-size: 16px; font-style: italic; color: #888; }
            .flourish { font-size: 30px; color: #d4af37; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">Wedding Invitation</div>
          <div class="subheader">Join Us In Our Joy</div>
          <div class="content">Dear</div>
          <div class="guest-name">${guest.full_name}</div>
          <div class="flourish">❧</div>
          <div class="content">${formattedMessage}</div>
          <div class="flourish">❧</div>
          <div class="footer">Please let us know if you will be attending.</div>
        </body>
      </html>
      `;
      
      Alert.alert('Generate Invitation', `Ready to generate a beautiful PDF invitation for ${guest.full_name}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate & Share', onPress: async () => {
            try {
              setIsDispatching(true);
              const Print = await import('expo-print');
              const Sharing = await import('expo-sharing');
              const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
              await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Share Invitation with ${guest.full_name}` });
              setIsDispatching(false);
            } catch (err: any) {
              setIsDispatching(false);
              Alert.alert('Error', err.message || 'Failed to share PDF');
            }
        }}
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const triggerPatrikaFlow = () => {
    if (availablePatrikas.length === 0) {
      Alert.alert('No Patrikas', 'You have not created any Patrika designs yet. Go to the Patrika tab to create one.');
      return;
    }
    if (availablePatrikas.length === 1) {
      handleSendPatrika(availablePatrikas[0]);
    } else {
      const options = availablePatrikas.map(p => ({ text: p.title, onPress: () => handleSendPatrika(p) }));
      options.push({ text: 'Cancel', style: 'cancel' } as any);
      Alert.alert('Select Patrika', 'Which invitation would you like to send?', options);
    }
  };

  const rsvpDisplay = 
    guest.rsvp_status === 'PENDING' ? 'Not responded' : 
    guest.rsvp_status === 'ATTENDING' ? 'Attending' : 
    guest.rsvp_status === 'MAYBE' ? 'Maybe' : 'Not attending';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            <Typography variant="body" color={theme.colors.primary}>Back</Typography>
          </Pressable>
          <Pressable onPress={() => router.push(`/(tabs)/guests/${guest.id}/edit`)}>
            <Typography variant="body" weight="semibold" color={theme.colors.primary}>Edit</Typography>
          </Pressable>
        </View>

        <View style={styles.profileHeader}>
          <View style={avatarStyle}>
            <Typography variant="screenTitle" color={theme.colors.surface}>
              {guest.full_name.charAt(0).toUpperCase()}
            </Typography>
          </View>
          <Typography variant="screenTitle" style={styles.name}>{guest.full_name}</Typography>
          
          <View style={styles.badgesRow}>
            {guest.side === 'Groom' ? (
              <View style={[styles.badge, styles.badgeGroom]}>
                <Typography variant="caption" weight="medium" style={styles.badgeTextGroom}>Groom Side</Typography>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeBride]}>
                <Typography variant="caption" weight="medium" style={styles.badgeTextBride}>Bride Side</Typography>
              </View>
            )}
            {group ? (
              <Pressable onPress={() => router.push(`/(tabs)/guests/${guest.id}/edit`)}>
                <View style={badgeGroupStyle}>
                  <Typography variant="caption" weight="medium" style={badgeTextGroupStyle}>{group.name}</Typography>
                </View>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push(`/(tabs)/guests/${guest.id}/edit`)}>
                <View style={badgeGroupStyle}>
                  <Typography variant="caption" weight="medium" style={badgeTextGroupStyle}>+ Add to Group</Typography>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
           <Button 
             label="Send Patrika Invitation" 
             onPress={triggerPatrikaFlow}
             icon="mail"
             isLoading={isDispatching}
           />
        </View>

        <Typography variant="caption" weight="semibold" style={sectionLabelStyle}>PERSONAL DETAILS</Typography>
        <View style={sectionBlockStyle}>
          <View style={[styles.listRow, listRowBorderStyle]}>
            <Ionicons name="people-outline" size={20} color={theme.colors.primary} style={styles.rowIcon} />
            <Typography variant="body" style={styles.rowLabel}>Party Size</Typography>
            <Typography variant="body" color={theme.colors.textSecondary}>{guest.party_size} {guest.party_size === 1 ? 'person' : 'people'}</Typography>
          </View>

          <View style={[styles.listRow, listRowBorderStyle, {borderBottomWidth: guest.phone || guest.notes ? 1 : 0}]}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.primary} style={styles.rowIcon} />
            <Typography variant="body" style={styles.rowLabel}>Wedding RSVP</Typography>
            <Typography variant="body" color={theme.colors.textSecondary}>{rsvpDisplay}</Typography>
          </View>

          {guest.phone && (
            <View style={[styles.listRow, listRowBorderStyle, {borderBottomWidth: guest.notes ? 1 : 0}]}>
              <Ionicons name="call-outline" size={20} color={theme.colors.primary} style={styles.rowIcon} />
              <Typography variant="body" style={styles.rowLabel}>Phone</Typography>
              <Typography variant="body" color={theme.colors.textSecondary}>{guest.phone}</Typography>
            </View>
          )}

          {guest.notes && (
            <View style={[styles.listRow, listRowBorderStyle]}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} style={styles.rowIcon} />
              <View style={{flex: 1}}>
                <Typography variant="body" style={styles.rowLabel}>Notes</Typography>
                <Typography variant="body" color={theme.colors.textSecondary}>{guest.notes}</Typography>
              </View>
            </View>
          )}
        </View>
        <Typography variant="caption" weight="semibold" style={sectionLabelStyle}>ACCOMMODATION</Typography>
        <View style={sectionBlockStyle}>
          {assignment ? (
            <Pressable style={[styles.listRow, listRowBorderStyle]} onPress={() => router.push(`/(tabs)/rooms/${assignment.room_id}` as any)}>
              <Ionicons name="bed" size={20} color={theme.colors.primary} style={styles.rowIcon} />
              <View style={{flex: 1}}>
                <Typography variant="body">Room {assignment.room_number}</Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>{assignment.hotel_name}</Typography>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
            </Pressable>
          ) : (
            <Pressable style={[styles.listRow, listRowBorderStyle]} onPress={() => router.push(`/(tabs)/guests/${guest.id}/assign-room`)}>
              <Ionicons name="bed-outline" size={20} color={theme.colors.textMuted} style={styles.rowIcon} />
              <Typography variant="body" color={theme.colors.textSecondary} style={{flex: 1}}>Not assigned</Typography>
              <Typography variant="body" color={theme.colors.primary}>Assign</Typography>
            </Pressable>
          )}
        </View>

        {events.length > 0 && (
          <>
            <Typography variant="caption" weight="semibold" style={sectionLabelStyle}>EVENTS</Typography>
            <View style={sectionBlockStyle}>
              {events.map((ev, idx) => (
                <Pressable 
                  key={ev.id} 
                  style={[styles.listRow, listRowBorderStyle, {borderBottomWidth: idx < events.length - 1 ? 1 : 0}]}
                  onPress={() => router.push(`/(tabs)/events/${ev.id}` as any)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} style={styles.rowIcon} />
                  <View style={{flex: 1}}>
                    <Typography variant="body">{ev.name}</Typography>
                    <Typography variant="caption" color={theme.colors.textSecondary}>
                      {ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                    </Typography>
                  </View>
                  <View style={[styles.badge, ev.event_rsvp_status === 'ATTENDING' ? [styles.badgeSent, badgeSentStyle] : [styles.badgeDefault, badgeDefaultStyle]]}>
                    <Typography variant="caption" color={ev.event_rsvp_status === 'ATTENDING' ? '#fff' : '#333'}>
                      {ev.event_rsvp_status === 'PENDING' ? 'No RSVP' : ev.event_rsvp_status}
                    </Typography>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {invitations.length > 0 && (
          <>
            <Typography variant="caption" weight="semibold" style={sectionLabelStyle}>INVITATIONS</Typography>
            <View style={sectionBlockStyle}>
              {invitations.map((inv, idx) => (
                <View key={inv.id} style={[styles.listRow, listRowBorderStyle, {borderBottomWidth: idx < invitations.length - 1 ? 1 : 0}]}>
                  <Ionicons name="mail-open-outline" size={20} color={theme.colors.primary} style={styles.rowIcon} />
                  <View style={{flex: 1}}>
                    <Typography variant="body">{inv.invitation_title}</Typography>
                    <Typography variant="caption" color={theme.colors.textSecondary}>
                      {inv.event_name ? `Event: ${inv.event_name}` : 'Main Wedding'}
                    </Typography>
                  </View>
                  <View style={[styles.badge, inv.status === 'SENT' ? [styles.badgeSent, badgeSentStyle] : [styles.badgeDefault, badgeDefaultStyle]]}>
                    <Typography variant="caption" color={inv.status === 'SENT' ? '#fff' : '#333'}>
                      {inv.status}
                    </Typography>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Button
          label="Delete Guest"
          variant="outline"
          onPress={handleDelete}
          style={deleteButtonStyle}
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGroom: {
    backgroundColor: '#E0F2FE', // Light blue
  },
  badgeTextGroom: {
    color: '#0369A1', // Dark blue
  },
  badgeBride: {
    backgroundColor: '#FCE7F3', // Light pink
  },
  badgeTextBride: {
    color: '#BE185D', // Dark pink
  },
  badgeGroup: {
    borderWidth: 1,
  },
  badgeTextGroup: {},
  badgeSent: {},
  badgeDefault: {},
  sectionLabel: {
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 24,
    letterSpacing: 1,
  },
  sectionBlock: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rowIcon: {
    marginRight: 16,
  },
  rowLabel: {
    flex: 1,
  },
  deleteButton: {
    marginTop: spacing.xxl,
  }
});
