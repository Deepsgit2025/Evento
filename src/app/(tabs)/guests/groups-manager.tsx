import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, TextInput, EmptyState } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { GroupService } from '../../../services/group';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { GuestGroup } from '../../../database/types';

export default function GroupsManagerScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [weddingId, setWeddingId] = useState('');
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Group State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSide, setNewSide] = useState<'Groom' | 'Bride'>('Groom');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      setWeddingId(wedding.id);
      const data = await GroupService.getGroups(db, wedding.id, 'All');
      setGroups(data);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      if (editingGroupId) {
        await GroupService.updateGroup(db, editingGroupId, newName.trim());
      } else {
        await GroupService.addGroup(db, weddingId, newName.trim(), newSide);
      }
      setNewName('');
      setIsCreating(false);
      setEditingGroupId(null);
      await loadGroups();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save group');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Group', `Are you sure you want to delete ${name}? Guests in this group will not be deleted, but they will lose their group association.`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await GroupService.deleteGroup(db, id);
          await loadGroups();
        }
      }
    ]);
  };

  const handleReorder = async (index: number, direction: 'up' | 'down', side: 'Groom' | 'Bride') => {
    const sideGroups = groups.filter(g => g.side === side).sort((a, b) => a.sort_order - b.sort_order);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sideGroups.length - 1) return;

    const current = sideGroups[index];
    const target = direction === 'up' ? sideGroups[index - 1] : sideGroups[index + 1];

    // Swap sort orders
    const updates = [
      { id: current.id, sort_order: target.sort_order },
      { id: target.id, sort_order: current.sort_order }
    ];

    try {
      await GroupService.updateSortOrders(db, updates);
      await loadGroups();
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    }
  };

  const renderSideGroups = (side: 'Groom' | 'Bride') => {
    const sideGroups = groups.filter(g => g.side === side).sort((a, b) => a.sort_order - b.sort_order);

    return (
      <View style={styles.sideSection}>
        <Typography variant="sectionTitle" style={[styles.sideTitle, { borderBottomColor: theme.colors.borderLight }]}>{side} Side</Typography>
        {sideGroups.length === 0 ? (
          <Typography variant="body" color={theme.colors.textSecondary} style={{marginLeft: 8}}>No groups added.</Typography>
        ) : (
          sideGroups.map((g, index) => (
            <Card key={g.id} style={styles.groupCard}>
              <View style={styles.groupInfo}>
                <Typography variant="body" weight="semibold">{g.name}</Typography>
              </View>
              
              <View style={styles.groupActions}>
                <Pressable onPress={() => handleReorder(index, 'up', side)} disabled={index === 0} style={[styles.iconBtn, index === 0 && styles.iconDisabled]}>
                  <Ionicons name="chevron-up" size={20} color={index === 0 ? theme.colors.border : theme.colors.text} />
                </Pressable>
                <Pressable onPress={() => handleReorder(index, 'down', side)} disabled={index === sideGroups.length - 1} style={[styles.iconBtn, index === sideGroups.length - 1 && styles.iconDisabled]}>
                  <Ionicons name="chevron-down" size={20} color={index === sideGroups.length - 1 ? theme.colors.border : theme.colors.text} />
                </Pressable>
                <Pressable onPress={() => { setIsCreating(true); setNewName(g.name); setNewSide(g.side); setEditingGroupId(g.id); }} style={styles.iconBtn}>
                  <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                </Pressable>
                <Pressable onPress={() => handleDelete(g.id, g.name)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </View>
    );
  };

  if (isLoading) return null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        {!isCreating && (
          <Button 
            label="Create New Group" 
            onPress={() => { setIsCreating(true); setNewName(''); setEditingGroupId(null); }}
            style={{ marginBottom: spacing.xl }}
          />
        )}

        {isCreating && (
          <Card style={[styles.createCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
            <Typography variant="sectionTitle" style={{marginBottom: 12}}>
              {editingGroupId ? 'Edit Group' : 'New Group'}
            </Typography>
            
            {!editingGroupId && (
              <View style={[styles.sideToggle, { backgroundColor: theme.colors.background }]}>
                <Pressable
                  style={[styles.toggleBtn, newSide === 'Groom' && { backgroundColor: theme.colors.primary }]}
                  onPress={() => setNewSide('Groom')}
                >
                  <Typography variant="body" color={newSide === 'Groom' ? '#fff' : theme.colors.text}>Groom</Typography>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, newSide === 'Bride' && { backgroundColor: theme.colors.primary }]}
                  onPress={() => setNewSide('Bride')}
                >
                  <Typography variant="body" color={newSide === 'Bride' ? '#fff' : theme.colors.text}>Bride</Typography>
                </Pressable>
              </View>
            )}

            <TextInput
              label="Group Name"
              placeholder="e.g. Mama Pariwar, VIP, Friends"
              value={newName}
              onChangeText={setNewName}
            />

            <View style={styles.createActions}>
              <Button label="Cancel" variant="outline" onPress={() => setIsCreating(false)} style={{flex: 1, marginRight: 8}} />
              <Button label="Save" onPress={handleCreate} style={{flex: 1, marginLeft: 8}} disabled={!newName.trim()} />
            </View>
          </Card>
        )}

        {renderSideGroups('Groom')}
        {renderSideGroups('Bride')}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  sideSection: {
    marginBottom: spacing.xl,
  },
  sideTitle: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  groupCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  groupInfo: {
    flex: 1,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    marginLeft: 4,
  },
  iconDisabled: {
    opacity: 0.5,
  },
  createCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  sideToggle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderRadius: radii.md,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  createActions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  }
});
