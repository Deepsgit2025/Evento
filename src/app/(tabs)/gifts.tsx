import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, EmptyState, Card, TextInput, Button } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { GiftService } from '../../services/gift';
import { Gift } from '../../database/types';

export default function GiftsScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [giverName, setGiverName] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setGifts(await GiftService.getGifts(db, wedding.id));
    } catch (e) {
      console.error('Failed to load gifts', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!weddingId || !giverName.trim()) return;
    setIsSaving(true);
    try {
      await GiftService.addGift(db, weddingId, {
        giver_name: giverName.trim(), description: description.trim() || undefined,
        estimated_value: value.trim() ? parseFloat(value) : undefined,
        date_received: new Date().toISOString().slice(0, 10),
      });
      setGiverName(''); setDescription(''); setValue(''); setShowAddForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleThankYou = async (g: Gift) => {
    await GiftService.toggleThankYou(db, g.id, !g.thank_you_sent);
    await load();
  };

  const remove = async (g: Gift) => {
    await GiftService.deleteGift(db, g.id);
    await load();
  };

  if (isLoading && gifts.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const pendingThankYous = gifts.filter(g => !g.thank_you_sent).length;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Gifts</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
            {gifts.length > 0 ? `${gifts.length} recorded • ${pendingThankYous} thank-you notes pending` : 'Track gifts for easy thank-you notes'}
          </Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => setShowAddForm(v => !v)}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <Card style={styles.card}>
            <TextInput label="Given By" placeholder="e.g. Uncle Rajesh" value={giverName} onChangeText={setGiverName} />
            <TextInput label="Description" placeholder="e.g. Gold necklace, Cash envelope" value={description} onChangeText={setDescription} />
            <TextInput label="Estimated Value (₹)" value={value} onChangeText={setValue} keyboardType="numeric" />
            <Button label={isSaving ? 'Adding...' : 'Add Gift'} onPress={handleAdd} isLoading={isSaving} disabled={!giverName.trim()} />
          </Card>
        )}

        {gifts.length === 0 && !showAddForm ? (
          <EmptyState
            icon={<Ionicons name="gift-outline" size={48} color={theme.colors.textMuted} />}
            title="No gifts recorded yet"
            description="Log who gave what so thank-you notes are easy to track."
            actionLabel="Add Gift"
            onAction={() => setShowAddForm(true)}
          />
        ) : (
          gifts.map((g) => (
            <Card key={g.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Typography variant="cardTitle">{g.giver_name}</Typography>
                  {g.description && <Typography variant="bodySecondary" color={theme.colors.textSecondary}>{g.description}</Typography>}
                  {g.estimated_value ? <Typography variant="caption" color={theme.colors.textMuted}>₹{g.estimated_value.toLocaleString('en-IN')}</Typography> : null}
                </View>
                <Pressable onPress={() => remove(g)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                </Pressable>
              </View>
              <Pressable onPress={() => toggleThankYou(g)} style={[styles.thankYouChip, { backgroundColor: g.thank_you_sent ? '#F0FDF4' : theme.colors.borderLight }]}>
                <Ionicons name={g.thank_you_sent ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={g.thank_you_sent ? theme.colors.success : theme.colors.textSecondary} />
                <Typography variant="caption" weight="medium" color={g.thank_you_sent ? theme.colors.success : theme.colors.textSecondary} style={{ marginLeft: 6 }}>
                  {g.thank_you_sent ? 'Thank-you sent' : 'Mark thank-you sent'}
                </Typography>
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { paddingHorizontal: 24 },
  card: { padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  thankYouChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
