import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { ScreenContainer, Typography, Card, Button, TextInput } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { BackupService } from '../../../services/backupService';
import { GoogleDriveService } from '../../../services/googleDriveService';
import { useLanguage } from '../../../i18n';

export default function SyncScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [email, setEmail] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  const handleLoginSubmit = () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid Gmail address to continue.');
      return;
    }
    setLoggedInEmail(email.trim());
    setShowGoogleModal(false);
    triggerSync(email.trim());
  };

  const triggerSync = async (targetEmail: string) => {
    Keyboard.dismiss();
    setIsScanning(true);
    setSyncStatus('idle');
    setStatusMessage(`Connecting to Google Drive...\nScanning backups for ${targetEmail}...`);

    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) {
        throw new Error('Not logged in. Please restart the app.');
      }
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) {
        Alert.alert('Setup Required', 'You must create a Wedding Profile before you can sync data to Google Drive.', [
          { text: 'Go to Home', onPress: () => router.push('/(tabs)') }
        ]);
        throw new Error('No wedding profile found.');
      }

      // 1. Try to download backup
      const backup = await GoogleDriveService.downloadBackupByEmail(targetEmail);
      
      if (backup) {
        setStatusMessage('Found existing backup on Google Drive! Restoring data...');
        const success = await BackupService.restoreBackup(db, backup);
        if (success) {
          setSyncStatus('success');
          setStatusMessage('Successfully synced with your other devices!');
        } else {
          setSyncStatus('error');
          setStatusMessage('Found a backup, but failed to restore it. Data might be corrupted.');
        }
      } else {
        // 2. If no backup, upload the current one
        setStatusMessage('No backup found on this email. Creating a new backup on Google Drive...');
        setIsScanning(false);
        setIsUploading(true);
        
        const newBackup = await BackupService.createBackup(db, wedding.id);
        const uploaded = await GoogleDriveService.uploadBackupByEmail(targetEmail, newBackup);
        
        if (uploaded) {
          setSyncStatus('success');
          setStatusMessage(`Successfully backed up to Google Drive under ${targetEmail}! Other devices can now sync using this email.`);
        } else {
          setSyncStatus('error');
          setStatusMessage('Failed to create a new backup on Google Drive.');
        }
      }
    } catch (e: any) {
      setSyncStatus('error');
      // If we threw it intentionally (e.g. no wedding profile), just show that message
      if (e.message === 'No wedding profile found.') {
        setStatusMessage('Sync cancelled: You must create a wedding profile first.');
      } else {
        setStatusMessage('An error occurred while connecting to Google Drive.');
      }
    } finally {
      setIsScanning(false);
      setIsUploading(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Cloud Sync</Typography>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="logo-google" size={32} color={theme.colors.primary} />
          </View>
          <Typography variant="sectionTitle" style={styles.infoTitle}>Google Drive Sync</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.infoDesc}>
            Log in with your Google Account on all your devices. We will securely scan your Google Drive to keep your wedding data perfectly synced for free.
          </Typography>
        </View>

        {!loggedInEmail ? (
          <Pressable 
            style={({pressed}) => [styles.googleButton, pressed && { opacity: 0.8 }]}
            onPress={() => setShowGoogleModal(true)}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Typography variant="body" weight="semibold" style={styles.googleButtonText}>
              Sign in with Google
            </Typography>
          </Pressable>
        ) : (
          <Card style={styles.card}>
            <View style={styles.accountHeader}>
              <View style={styles.avatar}>
                <Typography variant="body" weight="bold" color="#FFF">
                  {loggedInEmail.charAt(0).toUpperCase()}
                </Typography>
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="body" weight="semibold">{loggedInEmail}</Typography>
                <Typography variant="caption" color={theme.colors.textSecondary}>Google Account Connected</Typography>
              </View>
              <Pressable onPress={() => { setLoggedInEmail(null); setSyncStatus('idle'); setStatusMessage(''); }}>
                <Typography variant="caption" color={theme.colors.primary} weight="semibold">Disconnect</Typography>
              </Pressable>
            </View>
            
            <Button 
              label={isScanning ? "Scanning Drive..." : isUploading ? "Uploading..." : "Sync Now"}
              onPress={() => triggerSync(loggedInEmail)}
              disabled={isScanning || isUploading}
              style={styles.syncBtn}
              icon={isScanning || isUploading ? undefined : "cloud-upload-outline"}
            />
          </Card>
        )}

        {(isScanning || isUploading || syncStatus !== 'idle') && (
          <View style={styles.statusBox}>
            {isScanning || isUploading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />
            ) : syncStatus === 'success' ? (
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} style={{ marginBottom: 16 }} />
            ) : (
              <Ionicons name="close-circle" size={48} color={theme.colors.error} style={{ marginBottom: 16 }} />
            )}
            <Typography 
              variant="body" 
              weight="medium" 
              color={syncStatus === 'error' ? theme.colors.error : theme.colors.text}
              style={{ textAlign: 'center' }}
            >
              {statusMessage}
            </Typography>
          </View>
        )}
      </ScrollView>

      {/* Google Login Modal */}
      <Modal visible={showGoogleModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalContent} behavior="padding">
            <View style={styles.modalHeader}>
              <View style={styles.googleIconWrapper}>
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </View>
              <Typography variant="sectionTitle" weight="bold" style={{ marginTop: 16 }}>Sign in</Typography>
              <Typography variant="body" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>
                Use your Google Account
              </Typography>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                placeholder="Email or phone"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ backgroundColor: '#F8F9FA' }}
              />
              <Typography variant="caption" color={theme.colors.primary} weight="semibold" style={{ marginTop: 8 }}>
                Forgot email?
              </Typography>
              <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 40 }}>
                To continue, Google will share your name, email address, and profile picture with Evento.
              </Typography>
            </View>

            <View style={styles.modalFooter}>
              <Button 
                label="Cancel" 
                variant="ghost" 
                onPress={() => setShowGoogleModal(false)} 
                style={{ flex: 1 }}
              />
              <Button 
                label="Next" 
                variant="primary" 
                onPress={handleLoginSubmit}
                style={{ flex: 1, backgroundColor: '#1A73E8' }}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  infoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoTitle: {
    marginBottom: theme.spacing.sm,
  },
  infoDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    paddingVertical: 14,
    paddingHorizontal: 24,
    ...theme.shadows.sm,
  },
  googleButtonText: {
    marginLeft: 12,
    color: theme.colors.text,
  },
  card: {
    padding: theme.spacing.lg,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBtn: {
    marginTop: theme.spacing.sm,
  },
  statusBox: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 32,
    paddingBottom: 16,
  },
  googleIconWrapper: {
    marginBottom: 8,
  },
  modalBody: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: '#FAFAFA',
  }
});
