import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../../components/ui';
import { useTheme } from '../../../../theme/ThemeContext';
import { spacing, radii } from '../../../../theme';
import { GuestService } from '../../../../services/guest';
import { GroupService } from '../../../../services/group';
import { GuestGroup } from '../../../../database/types';
import { Ionicons } from '@expo/vector-icons';

export default function EditGuestModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const chipStyle = (selected: boolean) => [
    styles.chip,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
    selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  ];
  const sideButtonInactiveStyle = { borderColor: theme.colors.border };

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [side, setSide] = useState<'Groom' | 'Bride'>('Groom');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [notes, setNotes] = useState('');
  const [rsvp, setRsvp] = useState<'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE'>('PENDING');
  
  // Group state
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!id) return;
      try {
        const g = await GuestService.getGuestById(db, id);
        if (g) {
          setWeddingId(g.wedding_id);
          setFullName(g.full_name);
          setSide(g.side);
          setPhone(g.phone || '');
          setPartySize(g.party_size.toString());
          setNotes(g.notes || '');
          setRsvp(g.rsvp_status as any);
          setSelectedGroupId(g.group_id);
          
          const fetchedGroups = await GroupService.getGroups(db, g.wedding_id, 'All');
          setGroups(fetchedGroups);
        }
      } catch (e) {
        setError("Failed to load guest data");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [id, db]);

  const handleSideChange = (newSide: 'Groom' | 'Bride') => {
    setSide(newSide);
    if (selectedGroupId) {
      const currentGroup = groups.find(g => g.id === selectedGroupId);
      if (currentGroup && currentGroup.side !== newSide) {
        setSelectedGroupId(null);
      }
    }
  };

  const handleSave = async () => {
    if (!id || !weddingId) return;
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
      await GuestService.updateGuest(db, id, {
        full_name: fullName,
        phone,
        side,
        party_size: size,
        notes,
        group_id: selectedGroupId,
        rsvp_status: rsvp
      });
      
      router.back();
    } catch (e: any) {
      setError(e.message || 'Failed to update guest');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" color={theme.colors.textMuted}>Loading...</Typography>
      </ScreenContainer>
    );
  }

  const visibleGroups = groups.filter(g => g.side === side);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Typography variant="sectionTitle">Edit Guest</Typography>
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
              style={[styles.sideButton, side === 'Groom' ? undefined : sideButtonInactiveStyle]}
            />
            <Button
              label="Bride"
              variant={side === 'Bride' ? 'primary' : 'outline'}
              onPress={() => handleSideChange('Bride')}
              style={[styles.sideButton, side === 'Bride' ? undefined : sideButtonInactiveStyle]}
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
            {visibleGroups.length === 0 && (
              <Typography variant="caption" color={theme.colors.textMuted}>No groups available for this side.</Typography>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>RSVP Status</Typography>
          <View style={styles.chipsContainer}>
            <Pressable 
              style={chipStyle(rsvp === 'PENDING')}
              onPress={() => setRsvp('PENDING')}
            >
              <Typography variant="caption" weight="medium" color={rsvp === 'PENDING' ? theme.colors.surface : theme.colors.textSecondary}>Not Responded</Typography>
            </Pressable>
            <Pressable 
              style={chipStyle(rsvp === 'ATTENDING')}
              onPress={() => setRsvp('ATTENDING')}
            >
              <Typography variant="caption" weight="medium" color={rsvp === 'ATTENDING' ? theme.colors.surface : theme.colors.textSecondary}>Attending</Typography>
            </Pressable>
            <Pressable 
              style={chipStyle(rsvp === 'MAYBE')}
              onPress={() => setRsvp('MAYBE')}
            >
              <Typography variant="caption" weight="medium" color={rsvp === 'MAYBE' ? theme.colors.surface : theme.colors.textSecondary}>Maybe</Typography>
            </Pressable>
            <Pressable 
              style={chipStyle(rsvp === 'DECLINED')}
              onPress={() => setRsvp('DECLINED')}
            >
              <Typography variant="caption" weight="medium" color={rsvp === 'DECLINED' ? theme.colors.surface : theme.colors.textSecondary}>Not Attending</Typography>
            </Pressable>
          </View>
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
          label={isSaving ? "Saving..." : "Save Changes"} 
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
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
