import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, EmptyState, Card } from '../../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { WhatsAppService } from '../../../../services/whatsapp';
import { AuthService } from '../../../../services/auth';
import { getUserWedding } from '../../../../services/wedding';
import { InvitationCampaign } from '../../../../database/types';

export default function CampaignsDashboard() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [campaigns, setCampaigns] = useState<InvitationCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      const config = await WhatsAppService.getConfig(db, wedding.id);
      setHasConfig(!!config);

      const items = await WhatsAppService.getCampaigns(db, wedding.id);
      setCampaigns(items);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  if (isLoading) return null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/(tabs)/patrika' as any)} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          <Typography variant="body" color={theme.colors.primary}>Patrikas</Typography>
        </Pressable>
        <Typography variant="screenTitle" style={{flex: 1, textAlign: 'center', marginRight: 40}}>Bulk Campaigns</Typography>
      </View>

      {!hasConfig && (
        <Pressable style={styles.warningBanner} onPress={() => router.push('/(tabs)/settings/whatsapp' as any)}>
          <Ionicons name="warning" size={20} color="#E09F3E" />
          <View style={{flex: 1, marginLeft: 12}}>
            <Typography variant="body" weight="semibold">WhatsApp API Not Configured</Typography>
            <Typography variant="caption">Tap here to set up your official API credentials before sending campaigns.</Typography>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#E09F3E" />
        </Pressable>
      )}

      {campaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="send" size={48} color={theme.colors.primary} />}
            title="No Campaigns Yet"
            description="Create a campaign to bulk-send customized Patrikas to your guests automatically via WhatsApp."
            actionLabel="Create Campaign"
            onAction={() => router.push('/(tabs)/patrika/campaigns/create' as any)}
          />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.topRow}>
            <Typography variant="sectionTitle">Recent Campaigns</Typography>
            <Pressable onPress={() => router.push('/(tabs)/patrika/campaigns/create' as any)}>
              <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
            </Pressable>
          </View>
          
          <View style={styles.list}>
            {campaigns.map(camp => (
              <Pressable 
                key={camp.id} 
                onPress={() => router.push(`/(tabs)/patrika/campaigns/${camp.id}` as any)}
              >
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Typography variant="body" weight="semibold">{camp.name}</Typography>
                    <View style={[styles.badge, camp.status === 'COMPLETED' ? styles.badgeComplete : styles.badgePending]}>
                      <Typography variant="caption" color={camp.status === 'COMPLETED' ? '#fff' : '#333'}>{camp.status}</Typography>
                    </View>
                  </View>
                  <View style={styles.statsRow}>
                    <Typography variant="caption" color={theme.colors.textSecondary}>
                      Tap to view live delivery statistics.
                    </Typography>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: theme.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    marginTop: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeComplete: {
    backgroundColor: theme.colors.success,
  },
  badgePending: {
    backgroundColor: theme.colors.border,
  }
});
