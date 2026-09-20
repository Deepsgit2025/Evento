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
import { SeatingService, SeatingTableWithGuests } from '../../services/seating';
import { Guest } from '../../database/types';

export default function SeatingPlannerScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [tables, setTables] = useState<SeatingTableWithGuests[]>([]);
  const [unseated, setUnseated] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('8');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setTables(await SeatingService.getTablesWithGuests(db, wedding.id));
      setUnseated(await SeatingService.getUnseatedGuests(db, wedding.id));
    } catch (e) {
      console.error('Failed to load seating planner', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddTable = async () => {
    if (!weddingId || !name.trim()) return;
    setIsSaving(true);
    try {
      await SeatingService.addTable(db, weddingId, { name: name.trim(), capacity: parseInt(capacity, 10) || 8 });
      setName(''); setCapacity('8'); setShowAddForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    await SeatingService.deleteTable(db, id);
    await load();
  };

  const handleAssign = async (tableId: string, guestId: string) => {
    await SeatingService.assignGuest(db, tableId, guestId);
    await load();
  };

  const handleUnassign = async (guestId: string) => {
    await SeatingService.unassignGuest(db, guestId);
    await load();
  };

  if (isLoading && tables.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const usedSeats = tables.reduce((sum, t) => sum + t.seatsUsed, 0);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Seating Planner</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
            {tables.length > 0 ? `${usedSeats}/${totalSeats} seats filled • ${unseated.length} unseated` : 'Visual table & seat planning'}
          </Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={() => setShowAddForm(v => !v)}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <Card style={styles.card}>
            <TextInput label="Table Name" placeholder="e.g. Table 1, Family Table" value={name} onChangeText={setName} />
            <TextInput label="Capacity" placeholder="8" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
            <Button label={isSaving ? 'Adding...' : 'Add Table'} onPress={handleAddTable} isLoading={isSaving} disabled={!name.trim()} />
          </Card>
        )}

        {tables.length === 0 && !showAddForm ? (
          <EmptyState
            icon={<Ionicons name="grid-outline" size={48} color={theme.colors.textMuted} />}
            title="No tables yet"
            description="Add tables and assign your real guest list to seats."
            actionLabel="Add Table"
            onAction={() => setShowAddForm(true)}
          />
        ) : (
          tables.map((table) => {
            const expanded = expandedId === table.id;
            const isFull = table.seatsUsed >= table.capacity;
            return (
              <Card key={table.id} style={styles.card}>
                <Pressable onPress={() => setExpandedId(expanded ? null : table.id)} style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="cardTitle">{table.name}</Typography>
                    <Typography variant="caption" color={isFull ? theme.colors.error : theme.colors.textSecondary}>
                      {table.seatsUsed} / {table.capacity} seats {isFull ? '• Full' : ''}
                    </Typography>
                  </View>
                  <Pressable onPress={() => handleDeleteTable(table.id)} hitSlop={8} style={{ marginRight: 12 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
                </Pressable>

                {table.guests.length > 0 && (
                  <View style={styles.guestChipsRow}>
                    {table.guests.map(g => (
                      <View key={g.id} style={[styles.guestChip, { backgroundColor: theme.colors.cardRose }]}>
                        <Typography variant="caption" weight="medium" color={theme.colors.primary}>{g.full_name}</Typography>
                      </View>
                    ))}
                  </View>
                )}

                {expanded && (
                  <View style={[styles.expandedArea, { borderTopColor: theme.colors.borderLight }]}>
                    <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={{ marginBottom: 8 }}>
                      SEATED HERE
                    </Typography>
                    {table.guests.map(g => (
                      <Pressable key={g.id} onPress={() => handleUnassign(g.id)} style={styles.guestRow}>
                        <Typography variant="body">{g.full_name}</Typography>
                        <Typography variant="caption" color={theme.colors.error}>Remove</Typography>
                      </Pressable>
                    ))}
                    <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={{ marginTop: 12, marginBottom: 8 }}>
                      ADD FROM UNSEATED ({unseated.length})
                    </Typography>
                    {unseated.length === 0 ? (
                      <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Everyone is seated.</Typography>
                    ) : unseated.map(g => (
                      <Pressable key={g.id} onPress={() => handleAssign(table.id, g.id)} style={styles.guestRow}>
                        <Typography variant="body">{g.full_name}</Typography>
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                      </Pressable>
                    ))}
                  </View>
                )}
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
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  guestChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  guestChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  expandedArea: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
});
