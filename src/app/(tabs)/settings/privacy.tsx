import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';
import { AuthService } from '../../../services/auth';

export default function PrivacyScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteData = () => {
    Alert.alert(
      "Delete Account & Data",
      "Are you absolutely sure? This will wipe all local data from this device and permanently delete your account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Forever", 
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Cloud sync now goes through Google Drive backup/restore, so there is no
              // remote auth user to delete here — wiping the local SQLite tables via
              // AuthService.signOut() removes everything this device holds.
              await AuthService.signOut(db);
              router.replace('/auth/login');
            } catch (e: any) {
              console.error("Deletion failed:", e instanceof Error ? e.message : String(e));
              Alert.alert("Error", "Could not delete account. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Privacy & Data</Typography>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Local-First Architecture</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.paragraph}>
            Evento is designed as a local-first application. This means all your wedding data (guests, events, budget, etc.) is primarily stored on your device's local database (SQLite).
          </Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.paragraph}>
            Your data is yours. We do not sell your personal information or your guests' information to third parties.
          </Typography>
        </Card>

        <Card style={styles.card}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Cloud Synchronization</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.paragraph}>
            If you enable Cloud Sync, your local data is securely transmitted and stored in our cloud infrastructure (Supabase) to allow multi-device access and backup. Data in transit is encrypted using standard HTTPS/WSS protocols.
          </Typography>
        </Card>

        <Card style={styles.card}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>AI Assistant Data</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.paragraph}>
            When using the AI Assistant, messages are sent directly to the Gemini API using the API key you provide. We do not store or intercept these chat messages on our servers.
          </Typography>
        </Card>

        <Card style={[styles.card, { borderColor: theme.colors.error, borderWidth: 1 }]}>
          <Typography variant="sectionTitle" color={theme.colors.error} style={styles.sectionTitle}>Danger Zone</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.paragraph}>
            Permanently delete your account and all associated local data. If you are a wedding owner, this action is destructive.
          </Typography>
          <Button
            label="Delete Account & Data"
            variant="outline"
            onPress={handleDeleteData}
            isLoading={isDeleting}
            style={{ marginTop: spacing.md, borderColor: theme.colors.error }}
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginBottom: spacing.sm,
    lineHeight: 22,
  }
});
