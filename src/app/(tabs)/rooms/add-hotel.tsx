import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { HotelService } from '../../../services/hotel';

export default function AddHotelModal() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const session = await AuthService.getCurrentSession(db);
      if (session) {
        const wedding = await getUserWedding(db, session.id);
        if (wedding) {
          setWeddingId(wedding.id);
        }
      }
    }
    init();
  }, [db]);

  const handleSave = async () => {
    if (!weddingId) return;
    if (!name.trim()) {
      setError('Hotel or Property name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await HotelService.addHotel(db, {
        wedding_id: weddingId,
        name,
        address,
        notes
      });
      router.back();
    } catch (e: any) {
      setError(e.message || 'Failed to add hotel');
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
          <Typography variant="sectionTitle">Add Property</Typography>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Typography variant="caption" color={theme.colors.error}>{error}</Typography>
          </View>
        )}

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Property Name *</Typography>
          <TextInput 
            value={name}
            onChangeText={setName}
            placeholder="e.g. Taj Palace"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Address</Typography>
          <TextInput 
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 2 Sardar Patel Marg, Diplomatic Enclave"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="body" weight="medium" style={styles.label}>Notes</Typography>
          <TextInput 
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Check-in after 2 PM"
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
          label={isSaving ? "Saving..." : "Save Property"} 
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
