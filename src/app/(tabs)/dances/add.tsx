import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, TextInput, Button, DateField } from '../../../components/ui';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { DanceService } from '../../../services/dance';

const SUGGESTIONS = ['First Dance', 'Father-Daughter Dance', 'Mother-Son Dance', 'Bridal Party Dance', 'Sangeet Performance'];

export default function AddDanceScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [weddingId, setWeddingId] = useState('');
  const [title, setTitle] = useState('');
  const [performers, setPerformers] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [choreographer, setChoreographer] = useState('');
  const [notes, setNotes] = useState('');

  const [practiceDate, setPracticeDate] = useState('');
  const [practiceTime, setPracticeTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderStyle, setReminderStyle] = useState<'ALARM' | 'MESSAGE'>('MESSAGE');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding) return;
        setWeddingId(wedding.id);

        if (editId) {
          const existing = await DanceService.getDanceById(db, editId);
          if (existing) {
            setTitle(existing.title);
            setPerformers(existing.performers || '');
            setSongTitle(existing.song_title || '');
            setSongArtist(existing.song_artist || '');
            setChoreographer(existing.choreographer || '');
            setNotes(existing.notes || '');
            if (existing.practice_time) {
              const d = new Date(existing.practice_time * 1000);
              const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
              setPracticeDate(`${y}-${m}-${day}`);
              setPracticeTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
              setReminderEnabled(true);
            }
            if (existing.reminder_style) setReminderStyle(existing.reminder_style);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [db, editId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a dance name.');
      return;
    }
    if (reminderEnabled && (!practiceDate || !practiceTime)) {
      Alert.alert('Error', 'Please pick both a date and a time for the practice reminder.');
      return;
    }

    let practiceTimestamp: number | null = null;
    if (reminderEnabled && practiceDate && practiceTime) {
      const [y, m, d] = practiceDate.split('-').map(Number);
      const [h, min] = practiceTime.split(':').map(Number);
      practiceTimestamp = Math.floor(new Date(y, m - 1, d, h, min, 0).getTime() / 1000);
    }

    setIsSaving(true);
    try {
      const dto = {
        title: title.trim(),
        performers: performers.trim() || null,
        song_title: songTitle.trim() || null,
        song_artist: songArtist.trim() || null,
        choreographer: choreographer.trim() || null,
        practice_time: practiceTimestamp,
        reminder_style: reminderEnabled ? reminderStyle : null,
        notes: notes.trim() || null,
      };
      if (editId) {
        await DanceService.updateDance(db, editId, weddingId, dto);
      } else {
        await DanceService.createDance(db, weddingId, dto);
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
        <Typography variant="sectionTitle">{editId ? 'Edit Dance' : 'New Dance'}</Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput label="Dance Name *" placeholder="e.g. First Dance" value={title} onChangeText={setTitle} />

        {!editId && (
          <View style={styles.chipsRow}>
            {SUGGESTIONS.map(s => (
              <Pressable key={s} style={styles.chip} onPress={() => setTitle(s)}>
                <Typography variant="caption" color={theme.colors.primary}>{s}</Typography>
              </Pressable>
            ))}
          </View>
        )}

        <TextInput label="Performers" placeholder="e.g. Bride & Father" value={performers} onChangeText={setPerformers} />
        <TextInput label="Song Title" placeholder="e.g. Perfect" value={songTitle} onChangeText={setSongTitle} />
        <TextInput label="Artist" placeholder="e.g. Ed Sheeran" value={songArtist} onChangeText={setSongArtist} />
        <TextInput label="Choreographer / Instructor" placeholder="Optional" value={choreographer} onChangeText={setChoreographer} />
        <TextInput label="Notes" placeholder="Formation, cues, outfit..." value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        <View style={styles.reminderToggleRow}>
          <Typography variant="body" weight="semibold">Practice Reminder</Typography>
          <Pressable
            onPress={() => setReminderEnabled(v => !v)}
            style={[styles.switchTrack, reminderEnabled && styles.switchTrackOn]}
          >
            <View style={[styles.switchThumb, reminderEnabled && styles.switchThumbOn]} />
          </Pressable>
        </View>

        {reminderEnabled && (
          <>
            <DateField label="Practice Date" value={practiceDate} onChange={setPracticeDate} minimumDate={new Date()} />
            <DateField label="Practice Time" value={practiceTime} onChange={setPracticeTime} mode="time" />

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
              </Pressable>
              <Pressable
                style={[styles.styleOption, reminderStyle === 'ALARM' && styles.styleOptionSelected]}
                onPress={() => setReminderStyle('ALARM')}
              >
                <Ionicons name="alarm-outline" size={20} color={reminderStyle === 'ALARM' ? theme.colors.primary : theme.colors.textSecondary} />
                <Typography variant="body" weight="medium" color={reminderStyle === 'ALARM' ? theme.colors.primary : theme.colors.text}>
                  Alarm
                </Typography>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label={editId ? 'Save Changes' : 'Add Dance'} onPress={handleSave} isLoading={isSaving} />
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
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
