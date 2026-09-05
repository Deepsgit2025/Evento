import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, ListItem } from '../../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { WhatsAppService } from '../../../../services/whatsapp';
import { getWedding } from '../../../../services/wedding';
import { buildInvitationHtml, buildInvitationText, resolveInvitationDetails } from '../../../../services/invitationDocument';
import { InvitationCampaign, InvitationRecipient } from '../../../../database/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function CampaignDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();

  const [campaign, setCampaign] = useState<InvitationCampaign | null>(null);
  const [recipients, setRecipients] = useState<(InvitationRecipient & { guest_name: string })[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [isDispatching, setIsDispatching] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const camp = await WhatsAppService.getCampaignById(db, id as string);
      setCampaign(camp);

      const recs = await WhatsAppService.getCampaignRecipients(db, id as string);
      setRecipients(recs);

      const s = await WhatsAppService.getCampaignStats(db, id as string);
      setStats(s);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDispatch = async () => {
    if (!campaign) return;

    // Find next pending recipient
    const nextRecipient = recipients.find(r => r.status === 'QUEUED' || r.status === 'FAILED');
    if (!nextRecipient) {
      Alert.alert('Done', 'No pending recipients.');
      await db.runAsync(`UPDATE invitation_campaigns SET status = 'COMPLETED', updated_at = ? WHERE id = ?`, [Math.floor(Date.now() / 1000), id as string]);
      loadData();
      return;
    }

    try {
      const guest = await db.getFirstAsync<any>(`SELECT * FROM guests WHERE id = ?`, [nextRecipient.guest_id]);
      if (!guest) {
        Alert.alert('Skip', `${nextRecipient.guest_name} could not be loaded. Marked as failed.`);
        await WhatsAppService.markRecipientFailed(db, nextRecipient.id);
        loadData();
        return;
      }

      const inv = await db.getFirstAsync<any>(`SELECT * FROM invitations WHERE id = ?`, [campaign.invitation_id]);
      const custData = inv && inv.customization_data ? JSON.parse(inv.customization_data) : {};
      const wedding = await getWedding(db, campaign.wedding_id);
      const details = resolveInvitationDetails(wedding, custData);

      const confirmStatus = () => {
        setTimeout(() => {
          Alert.alert('Confirm Status', `Did you successfully send the invitation to ${guest.full_name}?`, [
            { text: 'No (Failed)', onPress: async () => { await WhatsAppService.markRecipientFailed(db, nextRecipient.id); loadData(); } },
            { text: 'Yes (Sent)', onPress: async () => { await WhatsAppService.markRecipientSent(db, nextRecipient.id); loadData(); } }
          ]);
        }, 1000);
      };

      Alert.alert(
        'Send Invitation',
        `How do you want to send this to ${guest.full_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'WhatsApp',
            onPress: async () => {
              if (!guest.phone) {
                Alert.alert('No Phone Number', `${guest.full_name} has no phone number saved, so WhatsApp can't be opened for them.`);
                return;
              }
              setIsDispatching(true);
              const opened = await WhatsAppService.openWhatsApp(guest.phone, buildInvitationText(details, guest.full_name));
              setIsDispatching(false);
              if (opened) {
                confirmStatus();
              } else {
                Alert.alert('Could not open WhatsApp', 'Make sure WhatsApp is installed on this device.');
              }
            }
          },
          {
            text: 'PDF',
            onPress: async () => {
              try {
                setIsDispatching(true);
                const html = buildInvitationHtml(details, guest.full_name);
                const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 }); // Standard Letter size

                await Sharing.shareAsync(uri, {
                  UTI: '.pdf',
                  mimeType: 'application/pdf',
                  dialogTitle: `Share Invitation with ${guest.full_name}`
                });

                setIsDispatching(false);
                confirmStatus();
              } catch (err: any) {
                setIsDispatching(false);
                Alert.alert('Error', err.message || 'Failed to share PDF');
              }
            }
          }
        ]
      );

    } catch (e: any) {
      setIsDispatching(false);
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleResend = (recipient: any) => {
    Alert.alert(
      'Resend Invitation',
      `Are you sure you want to resend the invitation to ${recipient.guest_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resend', 
          onPress: async () => {
            await db.runAsync(
              `UPDATE invitation_recipients SET status = 'QUEUED', updated_at = ? WHERE id = ?`,
              [Math.floor(Date.now() / 1000), recipient.id]
            );
            loadData();
          }
        }
      ]
    );
  };

  if (!campaign) return null;

  return (
    <ScreenContainer>
      <ScrollView>
        <Card style={styles.card}>
          <Typography variant="sectionTitle">{campaign.name}</Typography>
          <View style={[styles.badge, campaign.status === 'COMPLETED' ? styles.badgeComplete : styles.badgePending]}>
            <Typography variant="caption" color={campaign.status === 'COMPLETED' ? '#fff' : '#333'}>{campaign.status}</Typography>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Typography variant="screenTitle">{stats.total}</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>Total</Typography>
            </View>
            <View style={styles.statBox}>
              <Typography variant="screenTitle" color={theme.colors.success}>{stats.sent}</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>Sent</Typography>
            </View>
            <View style={styles.statBox}>
              <Typography variant="screenTitle" color={theme.colors.error}>{stats.failed}</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>Failed</Typography>
            </View>
            <View style={styles.statBox}>
              <Typography variant="screenTitle" color={theme.colors.textSecondary}>{stats.pending}</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>Pending</Typography>
            </View>
          </View>
        </Card>

        {stats.pending > 0 || stats.failed > 0 ? (
          <View style={styles.actions}>
            <Button 
              label="Send to Next Guest via WhatsApp"
              onPress={handleDispatch}
              isLoading={isDispatching}
            />
          </View>
        ) : null}

        <View style={styles.listSection}>
          <Typography variant="sectionTitle" style={styles.listTitle}>Recipients Breakdown</Typography>
          {recipients.map(r => (
            <Pressable key={r.id} onPress={() => handleResend(r)}>
              <ListItem
                title={r.guest_name}
                subtitle={`Status: ${r.status}`}
                rightElement={
                  <View style={[styles.statusBadge, r.status === 'SENT' ? styles.statusBadgeSent : (r.status === 'FAILED' ? styles.statusBadgeFailed : styles.statusBadgePending)]}>
                    <Typography variant="caption" color={r.status === 'QUEUED' ? '#333' : '#fff'}>{r.status}</Typography>
                  </View>
                }
                style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  badge: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeComplete: {
    backgroundColor: theme.colors.success,
  },
  badgePending: {
    backgroundColor: theme.colors.border,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  statBox: {
    alignItems: 'center',
  },
  actions: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  listSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
  },
  listTitle: {
    paddingVertical: theme.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeSent: {
    backgroundColor: theme.colors.success,
  },
  statusBadgeFailed: {
    backgroundColor: theme.colors.error,
  },
  statusBadgePending: {
    backgroundColor: theme.colors.border,
  }
});
