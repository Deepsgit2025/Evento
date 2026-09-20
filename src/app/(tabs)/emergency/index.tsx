import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, EmptyState, Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { EmergencyContactService } from '../../../services/emergencyContact';
import { EmergencyContact } from '../../../database/types';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Ambulance': 'medkit', 'Hospital': 'medical', 'Police': 'shield-checkmark',
  'Security': 'lock-closed', 'Venue Manager': 'business', 'Electrician': 'flash',
  'Plumber': 'water', 'Driver': 'car', 'Family Emergency Contact': 'people', 'Other': 'call',
};

export default function EmergencyCenterScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setContacts(await EmergencyContactService.getContacts(db, wedding.id));
    } catch (e) {
      console.error('Failed to load emergency contacts', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = (contact: EmergencyContact) => {
    Alert.alert('Remove contact?', `Remove ${contact.name} from Emergency Center?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await EmergencyContactService.deleteContact(db, contact.id); await load(); } },
    ]);
  };

  if (isLoading && contacts.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Emergency Center</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Important numbers, one tap away</Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => router.push('/(tabs)/emergency/add')}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      {contacts.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />}
          title="No emergency contacts yet"
          description="Add the ambulance, hospital, security, and other important numbers for the wedding."
          actionLabel="Add Contact"
          onAction={() => router.push('/(tabs)/emergency/add')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {contacts.map((c) => (
            <Card key={c.id} style={[styles.card, styles.cardRow]}>
              <View style={[styles.iconBg, { backgroundColor: theme.colors.cardRose }]}>
                <Ionicons name={CATEGORY_ICONS[c.category] || 'call'} size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Typography variant="body" weight="semibold">{c.name}</Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>{c.category}</Typography>
              </View>
              <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${c.phone}`).catch(() => {})}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(c)}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  card: { padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});
