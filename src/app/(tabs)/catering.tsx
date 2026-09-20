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
import { CateringService } from '../../services/catering';
import { EventService } from '../../services/event';
import { CateringItem, CATERING_CATEGORIES, Event } from '../../database/types';

export default function CateringScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [items, setItems] = useState<CateringItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(CATERING_CATEGORIES[1]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setItems(await CateringService.getItems(db, wedding.id));
      setEvents(await EventService.getEvents(db, wedding.id));
    } catch (e) {
      console.error('Failed to load catering', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!weddingId || !name.trim()) return;
    setIsSaving(true);
    try {
      await CateringService.addItem(db, weddingId, {
        name: name.trim(), category, event_id: eventId, guest_count_estimate: guestCount.trim() ? parseInt(guestCount, 10) : undefined,
      });
      setName(''); setGuestCount(''); setEventId(null); setShowAddForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: CateringItem) => {
    await CateringService.setStatus(db, item.id, item.status === 'PLANNED' ? 'CONFIRMED' : 'PLANNED');
    await load();
  };

  const remove = async (item: CateringItem) => {
    await CateringService.deleteItem(db, item.id);
    await load();
  };

  if (isLoading && items.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const eventName = (id: string | null) => events.find(e => e.id === id)?.name;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Catering</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>{items.length} menu item{items.length !== 1 ? 's' : ''} planned</Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => setShowAddForm(v => !v)}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <Card style={styles.card}>
            <TextInput label="Item / Dish Name" placeholder="e.g. Paneer Tikka, Biryani" value={name} onChangeText={setName} />
            <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Category</Typography>
            <View style={styles.chipRow}>
              {CATERING_CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.chip, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? theme.colors.cardRose : theme.colors.surface }]}>
                    <Typography variant="caption" weight={selected ? 'semibold' : 'medium'} color={selected ? theme.colors.primary : theme.colors.textSecondary}>{cat}</Typography>
                  </Pressable>
                );
              })}
            </View>
            {events.length > 0 && (
              <>
                <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Event (optional)</Typography>
                <View style={styles.chipRow}>
                  {events.map((e) => {
                    const selected = eventId === e.id;
                    return (
                      <Pressable key={e.id} onPress={() => setEventId(selected ? null : e.id)} style={[styles.chip, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? theme.colors.cardGold : theme.colors.surface }]}>
                        <Typography variant="caption" weight={selected ? 'semibold' : 'medium'} color={selected ? theme.colors.accentDark : theme.colors.textSecondary}>{e.name}</Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            <TextInput label="Estimated Guest Count" value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" containerStyle={{ marginTop: theme.spacing.md }} />
            <Button label={isSaving ? 'Adding...' : 'Add Item'} onPress={handleAdd} isLoading={isSaving} disabled={!name.trim()} />
          </Card>
        )}

        {items.length === 0 && !showAddForm ? (
          <EmptyState
            icon={<Ionicons name="restaurant-outline" size={48} color={theme.colors.textMuted} />}
            title="No menu items yet"
            description="Plan your catering menu and confirm items with your caterer."
            actionLabel="Add Item"
            onAction={() => setShowAddForm(true)}
          />
        ) : (
          items.map((item) => (
            <Card key={item.id} style={[styles.card, styles.itemRow]}>
              <View style={{ flex: 1 }}>
                <Typography variant="cardTitle">{item.name}</Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>
                  {item.category}{eventName(item.event_id) ? ` • ${eventName(item.event_id)}` : ''}{item.guest_count_estimate ? ` • ~${item.guest_count_estimate} guests` : ''}
                </Typography>
              </View>
              <Pressable onPress={() => toggleStatus(item)} style={[styles.statusChip, { backgroundColor: item.status === 'CONFIRMED' ? '#F0FDF4' : theme.colors.borderLight }]}>
                <Typography variant="caption" weight="bold" color={item.status === 'CONFIRMED' ? '#16A34A' : theme.colors.textSecondary}>
                  {item.status === 'CONFIRMED' ? 'Confirmed' : 'Planned'}
                </Typography>
              </Pressable>
              <Pressable onPress={() => remove(item)} hitSlop={8} style={{ marginLeft: 12 }}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
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
  label: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
