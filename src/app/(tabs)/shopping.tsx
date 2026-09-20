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
import { ShoppingService } from '../../services/shopping';
import { ShoppingItem } from '../../database/types';

export default function ShoppingScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setItems(await ShoppingService.getItems(db, wedding.id));
    } catch (e) {
      console.error('Failed to load shopping list', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!weddingId || !title.trim()) return;
    setIsSaving(true);
    try {
      await ShoppingService.addItem(db, weddingId, {
        title: title.trim(), estimated_cost: cost.trim() ? parseFloat(cost) : undefined, assigned_to: assignedTo.trim() || undefined,
      });
      setTitle(''); setCost(''); setAssignedTo(''); setShowAddForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = async (item: ShoppingItem) => {
    await ShoppingService.togglePurchased(db, item.id, !item.purchased);
    await load();
  };

  const remove = async (item: ShoppingItem) => {
    await ShoppingService.deleteItem(db, item.id);
    await load();
  };

  if (isLoading && items.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const totalCost = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);
  const purchasedCount = items.filter(i => i.purchased).length;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Shopping List</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
            {items.length > 0 ? `${purchasedCount}/${items.length} purchased${totalCost > 0 ? ` • ₹${totalCost.toLocaleString('en-IN')} estimated` : ''}` : 'Wedding shopping, tracked'}
          </Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => setShowAddForm(v => !v)}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <Card style={styles.card}>
            <TextInput label="Item" placeholder="e.g. Wedding favors, Decor lights" value={title} onChangeText={setTitle} />
            <TextInput label="Estimated Cost (₹)" value={cost} onChangeText={setCost} keyboardType="numeric" />
            <TextInput label="Assigned To" placeholder="e.g. Mom, Wedding Planner" value={assignedTo} onChangeText={setAssignedTo} />
            <Button label={isSaving ? 'Adding...' : 'Add Item'} onPress={handleAdd} isLoading={isSaving} disabled={!title.trim()} />
          </Card>
        )}

        {items.length === 0 && !showAddForm ? (
          <EmptyState
            icon={<Ionicons name="cart-outline" size={48} color={theme.colors.textMuted} />}
            title="Your shopping list is empty"
            description="Track what needs to be bought for the wedding, and who's getting it."
            actionLabel="Add Item"
            onAction={() => setShowAddForm(true)}
          />
        ) : (
          items.map((item) => (
            <Card key={item.id} style={[styles.card, styles.itemRow]}>
              <Pressable onPress={() => toggle(item)} hitSlop={8}>
                <Ionicons name={item.purchased ? 'checkbox' : 'square-outline'} size={24} color={item.purchased ? theme.colors.success : theme.colors.textMuted} />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Typography variant="body" weight="semibold" style={item.purchased ? { textDecorationLine: 'line-through', color: theme.colors.textMuted } : undefined}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>
                  {item.assigned_to ? `${item.assigned_to} • ` : ''}{item.estimated_cost ? `₹${item.estimated_cost.toLocaleString('en-IN')}` : 'No cost set'}
                </Typography>
              </View>
              <Pressable onPress={() => remove(item)} hitSlop={8}>
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
  itemRow: { flexDirection: 'row', alignItems: 'center' },
});
