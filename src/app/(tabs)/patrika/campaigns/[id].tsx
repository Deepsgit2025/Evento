import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, ListItem } from '../../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { WhatsAppService } from '../../../../services/whatsapp';
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
      
      const messageRaw = custData.message || 'We invite you to share our joy';
      let formattedMessage = messageRaw.replace(/{guest name}/gi, guest.full_name).replace(/\n/g, '<br/>');
      
      const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #fdfbf7;
              color: #4a4a4a;
              text-align: center;
              padding: 40px;
              margin: 20px;
              border: 8px solid #d4af37;
              border-radius: 12px;
            }
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
      
      Alert.alert(
        'Generate Invitation',
        `Ready to generate a beautiful PDF invitation for ${guest.full_name}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate & Share',
            onPress: async () => {
              try {
                setIsDispatching(true);
                const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 }); // Standard Letter size
                
                await Sharing.shareAsync(uri, {
                  UTI: '.pdf',
                  mimeType: 'application/pdf',
                  dialogTitle: `Share Invitation with ${guest.full_name}`
                });
                
                setIsDispatching(false);

                // Ask if successful
                setTimeout(() => {
                  Alert.alert('Confirm Status', `Did you successfully share the invitation with ${guest.full_name}?`, [
                    { text: 'No (Failed)', onPress: async () => { await WhatsAppService.markRecipientFailed(db, nextRecipient.id); loadData(); } },
                    { text: 'Yes (Sent)', onPress: async () => { await WhatsAppService.markRecipientSent(db, nextRecipient.id); loadData(); } }
                  ]);
                }, 1000);
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
