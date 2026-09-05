import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Button, Typography, ListItem } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { TEMPLATES, PatrikaProps } from '../../../components/patrika/Templates';
import { PatrikaService, PatrikaCustomization } from '../../../services/patrika';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { InvitationRecipient } from '../../../database/types';
import { formatIsoDateFriendly } from '../../../utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();

  const [templateComponent, setTemplateComponent] = useState<any>(null);
  const [templateId, setTemplateId] = useState<string>('');
  const [previewProps, setPreviewProps] = useState<PatrikaProps | null>(null);
  const [recipients, setRecipients] = useState<(InvitationRecipient & { guest_name: string, event_name: string | null })[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const inv = await PatrikaService.getInvitationById(db, id);
        if (!inv) return;

        const template = TEMPLATES.find((t: any) => t.id === inv.template_id);
        if (template) setTemplateComponent(() => template.component);
        setTemplateId(inv.template_id);

        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding) return;

        let cust: PatrikaCustomization = { message: '' };
        try { cust = JSON.parse(inv.customization_data); } catch(e) {}

        setPreviewProps({
          brideName: wedding.bride_name,
          groomName: wedding.groom_name,
          date: cust.custom_date || formatIsoDateFriendly(wedding.date) || 'TBD',
          venue: cust.custom_venue || wedding.venue || 'TBD',
          message: cust.message,
          photoUri: cust.cover_photo_uri,
          accentColor: cust.accent_color,
          width: SCREEN_WIDTH // Full width
        });

        // Load recipients
        const recs = await PatrikaService.getRecipientsForInvitation(db, id);
        setRecipients(recs);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
      }
    }
    loadData();
  }, [db, id]);

  const handleSimulateSend = async () => {
    const queued = recipients.filter(r => r.status === 'QUEUED');
    if (queued.length === 0) {
      Alert.alert('No Queued Guests', 'All guests have already been sent this invitation.');
      return;
    }
    
    // Simulate sending process
    Alert.alert('Sending...', `Sending to ${queued.length} guests. This might take a moment.`, [], { cancelable: false });
    
    for (const r of queued) {
      await PatrikaService.updateRecipientStatus(db, r.id, 'SENDING');
    }
    const sendingRecs = await PatrikaService.getRecipientsForInvitation(db, id);
    setRecipients(sendingRecs);
    
    setTimeout(async () => {
      for (const r of queued) {
        await PatrikaService.updateRecipientStatus(db, r.id, 'SENT');
      }
      const sentRecs = await PatrikaService.getRecipientsForInvitation(db, id);
      setRecipients(sentRecs);
      Alert.alert('Success', `Successfully sent ${queued.length} invitations.`);
    }, 2000);
  };

  const handleDelete = () => {
    Alert.alert("Delete Design", "Are you sure you want to delete this Patrika design?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          await PatrikaService.deleteInvitation(db, id);
          router.replace('/(tabs)/patrika' as any);
        }
      }
    ]);
  };

  if (!templateComponent || !previewProps) return null;
  const Template = templateComponent;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.canvas, { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5, borderColor: previewProps.accentColor || 'transparent', borderWidth: previewProps.accentColor ? 4 : 0 }]}>
          <Template {...previewProps} />
        </View>
        <View style={styles.actions}>
          <Button
            label="Create Bulk Campaign"
            onPress={() => router.push(`/(tabs)/patrika/campaigns` as any)}
            style={{ marginBottom: 12 }}
          />
          <View style={{flexDirection: 'row', gap: 12}}>
            <Button
              label="Edit Design"
              variant="outline"
              onPress={() => router.push(`/(tabs)/patrika/customize?templateId=${templateId}&editId=${id}` as any)}
              style={{ flex: 1 }}
            />
            <Button
              label="Delete Patrika"
              variant="outline"
              onPress={handleDelete}
              style={{ flex: 1, borderColor: 'red' }}
            />
          </View>
        </View>

        <View style={styles.recipientsSection}>
          <Typography variant="sectionTitle" style={styles.recipientsTitle}>Recent Recipients ({recipients.length})</Typography>
          <Typography variant="caption" color={theme.colors.textSecondary} style={{paddingHorizontal: 20}}>
            Use Bulk Campaigns to view grouped analytics and dispatch invitations.
          </Typography>
          {recipients.length === 0 ? (
            <Typography variant="body" color={theme.colors.textSecondary} style={{padding: 20, textAlign: 'center'}}>
              No guests selected yet.
            </Typography>
          ) : (
            recipients.map(r => (
              <ListItem
                key={r.id}
                title={r.guest_name}
                subtitle={r.event_name ? `Event: ${r.event_name}` : 'Main Wedding'}
                rightElement={
                  <View style={[styles.badge, r.status === 'SENT' ? styles.badgeSent : styles.badgeQueued]}>
                    <Typography variant="caption" color={r.status === 'SENT' ? '#fff' : '#333'}>{r.status}</Typography>
                  </View>
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#000',
  },
  canvas: {
    backgroundColor: '#fff',
  },
  actions: {
    padding: 20,
    backgroundColor: '#000',
  },
  recipientsSection: {
    backgroundColor: theme.colors.background,
    minHeight: 300,
  },
  recipientsTitle: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSent: {
    backgroundColor: theme.colors.success,
  },
  badgeQueued: {
    backgroundColor: theme.colors.border,
  }
});
