import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { EventService } from '../../../services/event';
import { Ionicons } from '@expo/vector-icons';

export default function AddEventScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customType, setCustomType] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const session = await AuthService.getCurrentSession(db);
      if (session) {
        const wedding = await getUserWedding(db, session.id);
        if (wedding) setWeddingId(wedding.id);
      }
    }
    init();
  }, [db]);

  const handleSave = async () => {
    if (!weddingId) return;
    
    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Date must be in YYYY-MM-DD format.");
      return;
    }
    if (!startTime.trim() || !/^\d{2}:\d{2}$/.test(startTime)) {
      setError("Start time must be in HH:MM (24-hour) format.");
      return;
    }
    if (endTime.trim() && !/^\d{2}:\d{2}$/.test(endTime)) {
      setError("End time must be in HH:MM (24-hour) format.");
      return;
    }

    if (endTime.trim() && endTime < startTime) {
       setError("End time cannot be before start time on the same day.");
       return;
    }

    setIsSaving(true);
    setError(null);

    const finalType = isCustomType ? customType : eventType;

    try {
      await EventService.createEvent(db, weddingId, {
        name: name.trim(),
        event_type: finalType.trim() || null,
        date: date.trim(),
        start_time: startTime.trim(),
        end_time: endTime.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
      });
      router.back();
    } catch (e: any) {
      setError(e.message || "Failed to add event.");
      setIsSaving(false);
    }
  };

  const renderTypeOption = (type: string) => {
    const isSelected = !isCustomType && eventType === type;
    return (
      <Pressable
        key={type}
        style={[
          styles.typeOption,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          isSelected && [styles.typeOptionSelected, { borderColor: theme.colors.primary }]
        ]}
        onPress={() => {
          setEventType(type);
          setIsCustomType(false);
        }}
      >
        <Typography 
          variant="caption" 
          weight={isSelected ? 'semibold' : 'medium'}
          color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
        >
          {type}
        </Typography>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer>
        <View style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <Typography variant="sectionTitle">New Event</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.error }]}>
              <Typography variant="caption" color={theme.colors.error}>{error}</Typography>
            </View>
          )}

          <View style={styles.section}>
            <Typography variant="body" weight="semibold" style={styles.sectionTitle}>Event Details</Typography>
            <TextInput
              label="Event Name *"
              placeholder="e.g. Haldi Ceremony"
              value={name}
              onChangeText={setName}
            />
            
            <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Event Type</Typography>
            <View style={styles.typeOptionsContainer}>
              {EventService.PREDEFINED_TYPES.map(renderTypeOption)}
              <Pressable
                style={[
                  styles.typeOption,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                  isCustomType && [styles.typeOptionSelected, { borderColor: theme.colors.primary }]
                ]}
                onPress={() => setIsCustomType(true)}
              >
                <Typography 
                  variant="caption" 
                  weight={isCustomType ? 'semibold' : 'medium'}
                  color={isCustomType ? theme.colors.primary : theme.colors.textSecondary}
                >
                  Custom
                </Typography>
              </Pressable>
            </View>

            {isCustomType && (
              <View style={{ marginTop: spacing.sm }}>
                <TextInput
                  placeholder="Enter custom event type"
                  value={customType}
                  onChangeText={setCustomType}
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Typography variant="body" weight="semibold" style={styles.sectionTitle}>Date & Time</Typography>
            <TextInput
              label="Date (YYYY-MM-DD) *"
              placeholder="e.g. 2026-12-14"
              value={date}
              onChangeText={setDate}
            />
            
            <View style={styles.row}>
              <View style={styles.flex1}>
                <TextInput
                  label="Start Time (HH:MM) *"
                  placeholder="e.g. 10:00"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={styles.flex1}>
                <TextInput
                  label="End Time (HH:MM)"
                  placeholder="e.g. 14:00"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Typography variant="body" weight="semibold" style={styles.sectionTitle}>Location & Description</Typography>
            <TextInput
              label="Location / Venue"
              placeholder="Where is this happening?"
              value={location}
              onChangeText={setLocation}
            />
            <TextInput
              label="Description / Notes"
              placeholder="Any details to remember?"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]}>
          <Button
            label={isSaving ? "Saving..." : "Save Event"} 
            variant="primary" 
            onPress={handleSave} 
            disabled={isSaving || !weddingId}
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  errorContainer: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radii.md,
    borderLeftWidth: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  typeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  typeOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
});
