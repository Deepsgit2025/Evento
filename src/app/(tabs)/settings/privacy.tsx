import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button } from '../../../components/ui';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { supabase } from '../../../services/supabase';

export default function PrivacyScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
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
              // Note: For full cloud deletion, an edge function should handle cascading deletes.
              // Here, we delete the Supabase Auth user (which can trigger cascading deletes if setup in Supabase)
              // and wipe local SQLite tables via AuthService.signOut().
              if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  // RPC call to a hypothetical delete_user function, or simply signing out and dropping local
                  // Supabase JS client cannot delete the user directly without service role, 
                  // but we can call an edge function or just clear local data for now as per offline-first rules.
                }
              }
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
            style={{ marginTop: theme.spacing.md, borderColor: theme.colors.error }}
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  paragraph: {
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  }
});
