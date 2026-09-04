import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { RoomService } from '../../../services/room';

const COMMON_ROOM_TYPES = ['Single', 'Double', 'Triple', 'Suite', 'Other'];

export default function AddRoomModal() {
  const { hotel_id } = useLocalSearchParams<{ hotel_id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Double');
  const [customRoomType, setCustomRoomType] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [notes, setNotes] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!hotel_id) {
      setError('No hotel selected');
      return;
    }
    if (!roomNumber.trim()) {
      setError('Room number/name is required');
      return;
    }

    const size = parseInt(capacity, 10);
    if (isNaN(size) || size < 1) {
      setError('Capacity must be at least 1');
      return;
    }

    const finalRoomType = roomType === 'Other' ? customRoomType : roomType;

    setIsSaving(true);
    setError(null);

    try {
      await RoomService.addRoom(db, {
        hotel_id,
        room_number: roomNumber,
        room_type: finalRoomType,
        capacity: size,
        notes
      });
      router.back();
    } catch (e: any) {
      setError(e.message || 'Failed to add room');
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Typography variant="sectionTitle">Add Room</Typography>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.error }]}>
            <Typography variant="caption" color={theme.colors.error}>{error}</Typography>
          </View>
        )}

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Room Number / Name *</Typography>
          <TextInput 
            value={roomNumber}
            onChangeText={setRoomNumber}
            placeholder="e.g. 101 or Villa 4"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Room Type</Typography>
          <View style={styles.chipsContainer}>
            {COMMON_ROOM_TYPES.map(type => (
              <Pressable
                key={type}
                style={[
                  styles.chip,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  roomType === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => setRoomType(type)}
              >
                <Typography 
                  variant="caption" 
                  weight="medium"
                  color={roomType === type ? theme.colors.surface : theme.colors.textSecondary}
                >
                  {type}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>

        {roomType === 'Other' && (
          <View style={styles.formGroup}>
            <Typography variant="body" weight="medium" style={styles.label}>Custom Room Type</Typography>
            <TextInput 
              value={customRoomType}
              onChangeText={setCustomRoomType}
              placeholder="e.g. Penthouse"
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Capacity (Max People)</Typography>
          <TextInput 
            value={capacity}
            onChangeText={setCapacity}
            placeholder="2"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Notes</Typography>
          <TextInput 
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Sea view, close to elevator"
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
          label={isSaving ? "Saving..." : "Save Room"} 
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
