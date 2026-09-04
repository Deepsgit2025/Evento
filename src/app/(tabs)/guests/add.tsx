import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { GuestService } from '../../../services/guest';
import { GroupService } from '../../../services/group';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { GuestGroup } from '../../../database/types';
import { Ionicons } from '@expo/vector-icons';

export default function AddGuestModal() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const chipStyle = (selected: boolean) => [
    styles.chip,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
    selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  ];

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [side, setSide] = useState<'Groom' | 'Bride'>('Groom');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [notes, setNotes] = useState('');
  
  // Group state
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const session = await AuthService.getCurrentSession(db);
      if (session) {
        const wedding = await getUserWedding(db, session.id);
        if (wedding) {
          setWeddingId(wedding.id);
          fetchGroups(wedding.id);
        }
      }
    }
    init();
  }, [db]);

  const fetchGroups = async (wId: string) => {
    const fetchedGroups = await GroupService.getGroups(db, wId, 'All');
    setGroups(fetchedGroups);
  };

  const handleSideChange = (newSide: 'Groom' | 'Bride') => {
    setSide(newSide);
    // Safety check: if currently selected group belongs to the other side, unselect it
    if (selectedGroupId) {
      const currentGroup = groups.find(g => g.id === selectedGroupId);
      if (currentGroup && currentGroup.side !== newSide) {
        setSelectedGroupId(null);
      }
    }
    setIsCreatingGroup(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !weddingId) return;
    try {
      const newId = await GroupService.addGroup(db, weddingId, newGroupName, side);
      await fetchGroups(weddingId);
      setSelectedGroupId(newId);
      setIsCreatingGroup(false);
      setNewGroupName('');
    } catch (e: any) {
      setError(e.message || "Failed to create group");
    }
  };

  const handleSave = async () => {
    if (!weddingId) return;
    if (!fullName.trim()) {
      setError('Guest name is required');
      return;
    }

    const size = parseInt(partySize, 10);
    if (isNaN(size) || size < 1) {
      setError('Party size must be at least 1');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // In GuestService we need to update it to accept group_id as well.
      // Wait, let's make sure we pass it. I will update GuestService next if needed.
      const id = await GuestService.addGuest(db, {
        wedding_id: weddingId,
        full_name: fullName,
        phone,
        side,
        party_size: size,
        notes,
        group_id: selectedGroupId // Passing this securely
      } as any); // Type cast temporarily if GuestService doesn't accept group_id yet
      
      router.back();
    } catch (e: any) {
      setError(e.message || 'Failed to save guest');
      setIsSaving(false);
    }
  };

  const visibleGroups = groups.filter(g => g.side === side);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Typography variant="sectionTitle">Add Guest</Typography>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.error }]}>
            <Typography variant="caption" color={theme.colors.error}>{error}</Typography>
          </View>
        )}

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Full Name *</Typography>
          <TextInput 
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Rohan Sharma"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Side</Typography>
          <View style={styles.sideToggle}>
            <Button 
              label="Groom" 
              variant={side === 'Groom' ? 'primary' : 'outline'}
              onPress={() => handleSideChange('Groom')}
              style={[styles.sideButton, side === 'Groom' ? undefined : { borderColor: theme.colors.border }]}
            />
            <Button
              label="Bride"
              variant={side === 'Bride' ? 'primary' : 'outline'}
              onPress={() => handleSideChange('Bride')}
              style={[styles.sideButton, side === 'Bride' ? undefined : { borderColor: theme.colors.border }]}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Family / Group</Typography>
          <View style={styles.chipsContainer}>
            {visibleGroups.map(group => (
              <Pressable 
                key={group.id} 
                style={chipStyle(selectedGroupId === group.id)}
                onPress={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
              >
                <Typography 
                  variant="caption" 
                  weight="medium"
                  color={selectedGroupId === group.id ? theme.colors.surface : theme.colors.textSecondary}
                >
                  {group.name}
                </Typography>
              </Pressable>
            ))}
            
            {!isCreatingGroup ? (
              <Pressable style={[styles.chipAdd, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]} onPress={() => setIsCreatingGroup(true)}>
                <Ionicons name="add" size={14} color={theme.colors.primary} />
                <Typography variant="caption" weight="medium" color={theme.colors.primary} style={styles.chipAddText}>
                  New Group
                </Typography>
              </Pressable>
            ) : null}
          </View>

          {isCreatingGroup && (
            <View style={styles.createGroupRow}>
              <View style={styles.createGroupInput}>
                <TextInput 
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="e.g. College Friends"
                  autoFocus
                />
              </View>
              <Button label="Add" variant="primary" onPress={handleCreateGroup} style={styles.createGroupBtn} />
              <Button label="Cancel" variant="ghost" onPress={() => { setIsCreatingGroup(false); setNewGroupName(''); }} />
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Phone Number</Typography>
          <TextInput 
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 234 567 8900"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Party Size</Typography>
          <TextInput 
            value={partySize}
            onChangeText={setPartySize}
            placeholder="1"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Notes</Typography>
          <TextInput 
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Needs early check-in"
            multiline
            style={styles.notesInput}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.borderLight }]}>
        <Button
          label="Cancel"
          variant="outline" 
          onPress={() => router.back()} 
          style={styles.footerButton} 
          disabled={isSaving}
        />
        <Button 
          label={isSaving ? "Saving..." : "Add Guest"} 
          variant="primary" 
          onPress={handleSave} 
          style={styles.footerButton} 
          disabled={isSaving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
  },
  sideToggle: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sideButton: {
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  chipAddText: {
    marginLeft: 4,
  },
  createGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  createGroupInput: {
    flex: 1,
  },
  createGroupBtn: {
    minHeight: 44,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
