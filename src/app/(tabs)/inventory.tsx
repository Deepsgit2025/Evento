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
import { InventoryService } from '../../services/inventory';
import { InventoryItem, InventoryStatus, INVENTORY_CATEGORIES } from '../../database/types';

const STATUS_META: Record<InventoryStatus, { label: string; color: string; bg: string }> = {
  OK: { label: 'OK', color: '#16A34A', bg: '#F0FDF4' },
  DAMAGED: { label: 'Damaged', color: '#D97706', bg: '#FFFBEB' },
  MISSING: { label: 'Missing', color: '#DC2626', bg: '#FEF2F2' },
};

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(INVENTORY_CATEGORIES[0]);
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setItems(await InventoryService.getItems(db, wedding.id));
    } catch (e) {
      console.error('Failed to load inventory', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!weddingId || !name.trim()) return;
    setIsSaving(true);
    try {
      await InventoryService.addItem(db, weddingId, {
        name: name.trim(), category, quantity: parseInt(quantity, 10) || 1, location: location.trim() || undefined,
      });
      setName(''); setQuantity('1'); setLocation(''); setShowAddForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const adjust = async (item: InventoryItem, delta: number) => {
    await InventoryService.adjustQuantity(db, item.id, delta);
    await load();
  };

  const setStatus = async (item: InventoryItem, status: InventoryStatus) => {
    await InventoryService.setStatus(db, item.id, status);
    await load();
  };

  const remove = async (item: InventoryItem) => {
    await InventoryService.deleteItem(db, item.id);
    await load();
  };

  if (isLoading && items.length === 0) {
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
          <Typography variant="screenTitle">Wedding Inventory</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>{items.length} item{items.length !== 1 ? 's' : ''} tracked</Typography>
        </View>
        <Pressable accessibilityLabel="Add item" style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => setShowAddForm(v => !v)}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <Card style={styles.card}>
            <TextInput label="Item Name" placeholder="e.g. Chairs, Garlands" value={name} onChangeText={setName} />
            <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Category</Typography>
            <View style={styles.chipRow}>
              {INVENTORY_CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.chip, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? theme.colors.cardGold : theme.colors.surface }]}>
                    <Typography variant="caption" weight={selected ? 'semibold' : 'medium'} color={selected ? theme.colors.accentDark : theme.colors.textSecondary}>{cat}</Typography>
                  </Pressable>
                );
              })}
            </View>
            <TextInput label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" containerStyle={{ marginTop: theme.spacing.md }} />
            <TextInput label="Location" placeholder="e.g. Storage Room, Venue Hall" value={location} onChangeText={setLocation} />
            <Button label={isSaving ? 'Adding...' : 'Add Item'} onPress={handleAdd} isLoading={isSaving} disabled={!name.trim()} />
          </Card>
        )}

        {items.length === 0 && !showAddForm ? (
          <EmptyState
            icon={<Ionicons name="cube-outline" size={48} color={theme.colors.textMuted} />}
            title="No inventory tracked yet"
            description="Track chairs, decor, rentals and more with real quantities and locations."
            actionLabel="Add Item"
            onAction={() => setShowAddForm(true)}
          />
        ) : (
          items.map((item) => {
            return (
              <Card key={item.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="cardTitle">{item.name}</Typography>
                    <Typography variant="caption" color={theme.colors.textSecondary}>{item.category}{item.location ? ` • ${item.location}` : ''}</Typography>
                  </View>
                  <Pressable onPress={() => remove(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.qtyRow}>
                  <Pressable style={[styles.qtyBtn, { backgroundColor: theme.colors.borderLight }]} onPress={() => adjust(item, -1)}>
                    <Ionicons name="remove" size={16} color={theme.colors.text} />
                  </Pressable>
                  <Typography variant="body" weight="bold" style={{ marginHorizontal: 16 }}>{item.available_quantity} / {item.quantity} available</Typography>
                  <Pressable style={[styles.qtyBtn, { backgroundColor: theme.colors.borderLight }]} onPress={() => adjust(item, 1)}>
                    <Ionicons name="add" size={16} color={theme.colors.text} />
                  </Pressable>
                </View>

                <View style={styles.statusRow}>
                  {(Object.keys(STATUS_META) as InventoryStatus[]).map((s) => {
                    const active = item.status === s;
                    const m = STATUS_META[s];
                    return (
                      <Pressable key={s} onPress={() => setStatus(item, s)} style={[styles.statusChip, { backgroundColor: active ? m.bg : theme.colors.borderLight }]}>
                        <Typography variant="caption" weight={active ? 'bold' : 'medium'} color={active ? m.color : theme.colors.textSecondary}>{m.label}</Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            );
          })
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
  label: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flex: 1, alignItems: 'center' },
});
