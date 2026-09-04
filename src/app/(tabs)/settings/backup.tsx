import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { BackupService, BackupData } from '../../../services/backupService';
import { router } from 'expo-router';

export default function BackupScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleCreateBackup = async () => {
    setIsExporting(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      const backupData = await BackupService.createBackup(db, wedding.id);
      const success = await BackupService.exportBackup(backupData);
      
      if (success) {
        Alert.alert("Success", "Backup created successfully.");
      }
    } catch (e) {
      console.error("Backup failed", e instanceof Error ? e.message : String(e));
      Alert.alert("Error", "Failed to create backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const backupData = await BackupService.pickBackupFile();
      if (!backupData) return; // User canceled

      // Show confirmation
      Alert.alert(
        "Restore Backup",
        "This will merge the backup data into your current wedding. Existing records with the same ID will be overwritten. Are you sure you want to proceed?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Restore", 
            style: "destructive",
            onPress: () => performRestore(backupData)
          }
        ]
      );
    } catch (e) {
      console.error("Failed to pick backup file", e instanceof Error ? e.message : String(e));
      Alert.alert("Invalid Backup", "The selected file is not a valid Evento backup.");
    }
  };

  const performRestore = async (backupData: BackupData) => {
    setIsRestoring(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) throw new Error("No session");
      
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) throw new Error("No wedding");

      if (backupData.wedding_id !== wedding.id) {
        Alert.alert(
          "Warning", 
          "This backup belongs to a different wedding ID. Restoring it here may cause data inconsistencies.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Restore Anyway", 
              style: "destructive",
              onPress: async () => {
                const success = await BackupService.restoreBackup(db, backupData);
                if (success) {
                  Alert.alert("Success", "Backup restored successfully.", [{ text: "OK", onPress: () => router.back() }]);
                } else {
                  Alert.alert("Error", "Failed to restore backup.");
                }
              }
            }
          ]
        );
        return;
      }

      const success = await BackupService.restoreBackup(db, backupData);
      if (success) {
        Alert.alert("Success", "Backup restored successfully.", [{ text: "OK", onPress: () => router.back() }]);
      } else {
        Alert.alert("Error", "Failed to restore backup.");
      }

    } catch (e) {
      console.error("Restore failed", e instanceof Error ? e.message : String(e));
      Alert.alert("Error", "An unexpected error occurred during restoration.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Data Backup</Typography>
      </View>

      <View style={styles.content}>
        <Card style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="cloud-upload-outline" size={40} color={theme.colors.primary} />
          </View>
          <Typography variant="cardTitle" style={styles.title}>Export Backup</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.description}>
            Create a local copy of all your wedding data including guests, events, and finances. Keep this file safe.
          </Typography>
          <Button 
            variant="primary" 
            label={isExporting ? "Creating Backup..." : "Create Backup"}
            onPress={handleCreateBackup}
            disabled={isExporting || isRestoring}
          />
        </Card>

        <Card style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.warning + '15' }]}>
            <Ionicons name="download-outline" size={40} color={theme.colors.warning} />
          </View>
          <Typography variant="cardTitle" style={styles.title}>Restore Backup</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.description}>
            Import data from a previously saved backup file. This will merge the backup into your current data.
          </Typography>
          <Button 
            variant="outline" 
            label={isRestoring ? "Restoring..." : "Select Backup File"}
            onPress={handleRestoreBackup}
            disabled={isExporting || isRestoring}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  }
});
