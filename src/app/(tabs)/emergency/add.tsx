import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { EmergencyContactService } from '../../../services/emergencyContact';
import { EMERGENCY_CONTACT_CATEGORIES } from '../../../database/types';

export default function AddEmergencyContactScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(EMERGENCY_CONTACT_CATEGORIES[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
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
    if (!name.trim() || !phone.trim()) { setError('Name and phone are required.'); return; }

    setIsSaving(true);
    setError(null);
    try {
      await EmergencyContactService.addContact(db, weddingId, {
        category, name: name.trim(), phone: phone.trim(), notes: notes.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Failed to save contact.');
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
          <Typography variant="sectionTitle">Add Contact</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error && <Typography variant="caption" color={theme.colors.error} style={{ marginBottom: theme.spacing.md }}>{error}</Typography>}

          <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Category</Typography>
          <View style={styles.chipRow}>
            {EMERGENCY_CONTACT_CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chip,
                    { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? theme.colors.cardRose : theme.colors.surface },
                  ]}
                >
                  <Typography variant="caption" weight={selected ? 'semibold' : 'medium'} color={selected ? theme.colors.primary : theme.colors.textSecondary}>
                    {cat}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <TextInput label="Name *" placeholder="e.g. City Hospital, Ramesh (Security)" value={name} onChangeText={setName} containerStyle={{ marginTop: theme.spacing.lg }} />
          <TextInput label="Phone *" placeholder="+91 98765 43210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput label="Notes" placeholder="Any extra details" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]}>
          <Button label={isSaving ? 'Saving...' : 'Save Contact'} onPress={handleSave} disabled={isSaving || !weddingId} />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  content: { padding: 16, paddingBottom: 32 },
  label: { marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
});
