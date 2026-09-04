import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, EmptyState, Card } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { PatrikaService } from '../../../services/patrika';
import { Invitation } from '../../../database/types';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { TEMPLATES } from '../../../components/patrika/Templates';

export default function MyPatrikasScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      const items = await PatrikaService.getInvitationsForWedding(db, wedding.id);
      setInvitations(items);
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
        <Pressable onPress={() => router.push('/(tabs)')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          <Typography variant="body" color={theme.colors.primary}>Home</Typography>
        </Pressable>
        <Typography variant="screenTitle" style={{flex: 1, textAlign: 'center', marginRight: 40}}>Digital Patrika</Typography>
      </View>

      {invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="mail-open" size={48} color={theme.colors.primary} />}
            title="Design your Patrika"
            description="Create beautiful, customized digital invitations for your events. Share them instantly with guests."
            actionLabel="Browse Templates"
            onAction={() => router.push('/(tabs)/patrika/gallery')}
          />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.topRow}>
            <Typography variant="sectionTitle">My Designs</Typography>
            <Pressable onPress={() => router.push('/(tabs)/patrika/gallery')}>
              <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
            </Pressable>
          </View>
          
          <View style={styles.grid}>
            {invitations.map(inv => {
              const template = TEMPLATES.find((t: any) => t.id === inv.template_id);
              let cust: any = {};
              try { cust = JSON.parse(inv.customization_data); } catch(e) {}
              
              return (
                <Pressable 
                  key={inv.id} 
                  style={styles.cardWrapper}
                  onPress={() => router.push(`/(tabs)/patrika/${inv.id}` as any)}
                >
                  <Card style={styles.card}>
                    {/* Mini Preview Placeholder */}
                    <View style={styles.previewBox}>
                      <Ionicons name="document-text" size={32} color={theme.colors.textSecondary} />
                      <Typography variant="caption" style={{marginTop: 8}}>{template?.name || 'Template'}</Typography>
                    </View>
                    
                    <Typography variant="body" weight="semibold" numberOfLines={1}>{inv.title}</Typography>
                    <Typography variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>
                      {cust.message || "Custom Invitation"}
                    </Typography>
                  </Card>
                </Pressable>
              );
            })}
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
    width: 60,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
    marginBottom: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
  },
  previewBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    aspectRatio: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  }
});
