import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { AnnouncementService } from '../../../services/announcement';
import { AnnouncementPriority } from '../../../database/types';

const PRIORITIES: { value: AnnouncementPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: '#6B7280' },
  { value: 'NORMAL', label: 'Normal', color: '#2563EB' },
  { value: 'HIGH', label: 'High', color: '#D97706' },
  { value: 'URGENT', label: 'Urgent', color: '#DC2626' },
];

const QUICK_TEMPLATES = [
  'Dinner is now open',
  'Baraat has arrived',
  'Photography session starting',
  'Please proceed to the main hall',
  'Event delayed',
  'Transport is ready',
];

export default function AddAnnouncementScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await AuthService.getCurrentSession(db);
      if (session) {
        const wedding = await getUserWedding(db, session.id);
        if (wedding) setWeddingId(wedding.id);
      }
    })();
  }, [db]);

  const handleSave = async () => {
    if (!weddingId) return;
    if (!title.trim() || !message.trim()) { setError('Title and message are required.'); return; }

    setIsSaving(true);
    setError(null);
    try {
      await AnnouncementService.createAnnouncement(db, weddingId, { title: title.trim(), message: message.trim(), priority });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Failed to post announcement.');
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer>
        <View style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <Typography variant="sectionTitle">New Announcement</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error && <Typography variant="caption" color={theme.colors.error} style={{ marginBottom: theme.spacing.md }}>{error}</Typography>}

          <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Quick templates</Typography>
          <View style={styles.chipRow}>
            {QUICK_TEMPLATES.map((tpl) => (
              <Pressable
                key={tpl}
                onPress={() => { setTitle(tpl); setMessage(tpl); }}
                style={[styles.chip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              >
                <Typography variant="caption" color={theme.colors.textSecondary}>{tpl}</Typography>
              </Pressable>
            ))}
          </View>

          <TextInput label="Title *" placeholder="e.g. Dinner is now open" value={title} onChangeText={setTitle} containerStyle={{ marginTop: theme.spacing.lg }} />
          <TextInput label="Message *" placeholder="Details for guests / team" value={message} onChangeText={setMessage} multiline numberOfLines={3} />

          <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Priority</Typography>
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => {
              const selected = priority === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[styles.chip, { borderColor: selected ? p.color : theme.colors.border, backgroundColor: selected ? p.color + '15' : theme.colors.surface }]}
                >
                  <Typography variant="caption" weight={selected ? 'bold' : 'medium'} color={selected ? p.color : theme.colors.textSecondary}>{p.label}</Typography>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + theme.spacing.lg }]}>
          <Button label={isSaving ? 'Posting...' : 'Post Announcement'} onPress={handleSave} disabled={isSaving || !weddingId} />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  content: { padding: 16, paddingBottom: 32 },
  label: { marginBottom: 8, marginLeft: 4, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
});
