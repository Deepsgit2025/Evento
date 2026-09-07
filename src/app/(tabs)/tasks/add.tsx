import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, TextInput, Button, DateField } from '../../../components/ui';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { TaskService, DEFAULT_REMINDER_LEAD_MINUTES } from '../../../services/task';
import { ReminderService } from '../../../services/reminder';

const LEAD_OPTIONS = [
  { minutes: 0, label: 'At time' },
  { minutes: 5, label: '5 min before' },
  { minutes: 30, label: '30 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
];

export default function AddTaskScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [weddingId, setWeddingId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderStyle, setReminderStyle] = useState<'ALARM' | 'MESSAGE'>('ALARM');
  const [leadMinutes, setLeadMinutes] = useState<number>(DEFAULT_REMINDER_LEAD_MINUTES);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding) return;
        setWeddingId(wedding.id);

        if (editId) {
          const existing = await TaskService.getTaskById(db, editId);
          if (existing) {
            setTitle(existing.title);
            setDescription(existing.description || '');
            setDueDate(existing.due_date || '');
            if (existing.reminder_time) {
              const d = new Date(existing.reminder_time * 1000);
              setDueTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
              setReminderEnabled(true);
            }
            if (existing.reminder_style) setReminderStyle(existing.reminder_style);
            if (existing.reminder_lead_minutes != null) setLeadMinutes(existing.reminder_lead_minutes);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [db, editId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }
    if (reminderEnabled && (!dueDate || !dueTime)) {
      Alert.alert('Error', 'Please pick both a date and a time for the reminder.');
      return;
    }

    if (reminderEnabled) {
      const hasPermission = await ReminderService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Notifications are turned off',
          'Evento can\'t ring an alarm or send a message without notification permission. Enable it in your phone\'s Settings > Apps > Evento > Notifications, then try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    let reminderTime: number | null = null;
    if (reminderEnabled && dueDate && dueTime) {
      const [y, m, d] = dueDate.split('-').map(Number);
      const [h, min] = dueTime.split(':').map(Number);
      reminderTime = Math.floor(new Date(y, m - 1, d, h, min, 0).getTime() / 1000);
    }

    setIsSaving(true);
    try {
      const dto = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        reminder_time: reminderTime,
        reminder_lead_minutes: leadMinutes,
        reminder_style: reminderEnabled ? reminderStyle : null,
      };
      if (editId) {
        await TaskService.updateTask(db, editId, weddingId, dto);
      } else {
        await TaskService.createTask(db, weddingId, dto);
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <ScreenContainer><View /></ScreenContainer>;

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <Typography variant="sectionTitle">{editId ? 'Edit Task' : 'New Task'}</Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput label="Task Title *" placeholder="e.g. Book the caterer" value={title} onChangeText={setTitle} />
        <TextInput
          label="Notes"
          placeholder="Any details to remember?"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <View style={styles.reminderToggleRow}>
          <Typography variant="body" weight="semibold">Remind me</Typography>
          <Pressable
            onPress={() => setReminderEnabled(v => !v)}
            style={[styles.switchTrack, reminderEnabled && styles.switchTrackOn]}
          >
            <View style={[styles.switchThumb, reminderEnabled && styles.switchThumbOn]} />
          </Pressable>
        </View>

        {reminderEnabled && (
          <>
            <DateField label="Due Date" value={dueDate} onChange={setDueDate} minimumDate={new Date()} />
            <DateField label="Due Time" value={dueTime} onChange={setDueTime} mode="time" />

            <Typography variant="caption" weight="medium" color={theme.colors.textSecondary} style={{ marginBottom: 8, marginLeft: 4 }}>
              Alert me
            </Typography>
            <View style={styles.leadRow}>
              {LEAD_OPTIONS.map(option => (
                <Pressable
                  key={option.minutes}
                  style={[styles.leadChip, leadMinutes === option.minutes && styles.leadChipSelected]}
                  onPress={() => setLeadMinutes(option.minutes)}
                >
                  <Typography
                    variant="caption"
                    weight={leadMinutes === option.minutes ? 'semibold' : 'regular'}
                    color={leadMinutes === option.minutes ? theme.colors.primary : theme.colors.textSecondary}
                  >
                    {option.label}
                  </Typography>
                </Pressable>
              ))}
            </View>

            <Typography variant="caption" weight="medium" color={theme.colors.textSecondary} style={{ marginBottom: 8, marginLeft: 4 }}>
              Remind me with
            </Typography>
            <View style={styles.styleRow}>
              <Pressable
                style={[styles.styleOption, reminderStyle === 'MESSAGE' && styles.styleOptionSelected]}
                onPress={() => setReminderStyle('MESSAGE')}
              >
                <Ionicons name="notifications-outline" size={20} color={reminderStyle === 'MESSAGE' ? theme.colors.primary : theme.colors.textSecondary} />
                <Typography variant="body" weight="medium" color={reminderStyle === 'MESSAGE' ? theme.colors.primary : theme.colors.text}>
                  Message
                </Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>A regular notification</Typography>
              </Pressable>
              <Pressable
                style={[styles.styleOption, reminderStyle === 'ALARM' && styles.styleOptionSelected]}
                onPress={() => setReminderStyle('ALARM')}
              >
                <Ionicons name="alarm-outline" size={20} color={reminderStyle === 'ALARM' ? theme.colors.primary : theme.colors.textSecondary} />
                <Typography variant="body" weight="medium" color={reminderStyle === 'ALARM' ? theme.colors.primary : theme.colors.text}>
                  Alarm
                </Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>Loud & urgent</Typography>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label={editId ? 'Save Changes' : 'Add Task'} onPress={handleSave} isLoading={isSaving} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  closeButton: { padding: 4 },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  switchTrack: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.border,
    padding: 3,
  },
  switchTrackOn: {
    backgroundColor: theme.colors.primary,
  },
  switchThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  leadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  leadChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  leadChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  styleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  styleOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  styleOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
});
