import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { theme } from '../../../theme';
import { RoomService } from '../../../services/room';

const COMMON_ROOM_TYPES = ['Single', 'Double', 'Triple', 'Suite', 'Other'];

export default function AddRoomModal() {
  const { hotel_id } = useLocalSearchParams<{ hotel_id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  
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
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Typography variant="sectionTitle">Add Room</Typography>
        </View>

        {error && (
          <View style={styles.errorContainer}>
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
                style={[styles.chip, roomType === type && styles.chipSelected]}
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

      <View style={styles.footer}>
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    paddingTop: theme.spacing.md,
  },
  errorContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: theme.spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
