import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { ScreenContainer, Typography, Card, Button, TextInput } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { BackupService } from '../../../services/backupService';
import { GoogleDriveService } from '../../../services/googleDriveService';
import { GOOGLE_DISCOVERY, GOOGLE_SCOPES, getGoogleClientId, isGoogleSyncConfigured, fetchGoogleProfile } from '../../../services/googleAuth';
import { useLanguage } from '../../../i18n';

const GOOGLE_SESSION_KEY = 'evento_google_session';

interface GoogleSessionData {
  accessToken: string;
  email: string;
  name: string;
}

export default function SyncScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useLanguage();

  const isConfigured = isGoogleSyncConfigured();

  // ── Real Google Sign-In (only wired up once a client ID is configured) ──
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'evento' });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getGoogleClientId(),
      scopes: GOOGLE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    GOOGLE_DISCOVERY
  );
  const [googleSession, setGoogleSession] = useState<GoogleSessionData | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    SecureStore.getItemAsync(GOOGLE_SESSION_KEY).then(raw => {
      if (raw) setGoogleSession(JSON.parse(raw));
    }).catch(() => {});
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured || !response) return;
    (async () => {
      if (response.type === 'success' && response.params.code) {
        setIsSigningIn(true);
        try {
          const tokenResult = await AuthSession.exchangeCodeAsync(
            {
              clientId: getGoogleClientId(),
              code: response.params.code,
              redirectUri,
              extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
            },
            GOOGLE_DISCOVERY
          );
          const profile = await fetchGoogleProfile(tokenResult.accessToken);
          const session: GoogleSessionData = { accessToken: tokenResult.accessToken, email: profile.email, name: profile.name };
          setGoogleSession(session);
          await SecureStore.setItemAsync(GOOGLE_SESSION_KEY, JSON.stringify(session));
        } catch (e) {
          Alert.alert('Sign-in failed', e instanceof Error ? e.message : String(e));
        } finally {
          setIsSigningIn(false);
        }
      } else if (response.type === 'error') {
        Alert.alert('Sign-in failed', response.error?.message || 'Google sign-in was cancelled or failed.');
      }
    })();
  }, [response, isConfigured]);

  const handleGoogleDisconnect = async () => {
    setGoogleSession(null);
    await SecureStore.deleteItemAsync(GOOGLE_SESSION_KEY).catch(() => {});
  };

  // ── Local demo sync (used whenever no Google OAuth client is configured) ──
  const [email, setEmail] = useState('');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleDemoLoginSubmit = () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to continue.');
      return;
    }
    setLoggedInEmail(email.trim());
    setShowDemoModal(false);
    triggerDemoSync(email.trim());
  };

  const triggerDemoSync = async (targetEmail: string) => {
    Keyboard.dismiss();
    setIsScanning(true);
    setSyncStatus('idle');
    setStatusMessage(`Scanning local demo backups for ${targetEmail}...`);

    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) throw new Error('Not logged in. Please restart the app.');
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) {
        Alert.alert('Setup Required', 'You must create a Wedding Profile before you can sync data.', [
          { text: 'Go to Home', onPress: () => router.push('/(tabs)') }
        ]);
        throw new Error('No wedding profile found.');
      }

      const backup = await GoogleDriveService.downloadBackupByEmail(targetEmail);

      if (backup) {
        setStatusMessage('Found an existing local demo backup! Restoring data...');
        const success = await BackupService.restoreBackup(db, backup);
        setSyncStatus(success ? 'success' : 'error');
        setStatusMessage(success ? 'Successfully synced with your other devices!' : 'Found a backup, but failed to restore it. Data might be corrupted.');
      } else {
        setStatusMessage('No backup found for this email. Creating one now...');
        setIsScanning(false);
        setIsUploading(true);

        const newBackup = await BackupService.createBackup(db, wedding.id);
        const uploaded = await GoogleDriveService.uploadBackupByEmail(targetEmail, newBackup);

        setSyncStatus(uploaded ? 'success' : 'error');
        setStatusMessage(uploaded
          ? `Saved a local demo backup under ${targetEmail}. Enter the same email on another device (in this demo mode) to sync.`
          : 'Failed to create a new backup.');
      }
    } catch (e: any) {
      setSyncStatus('error');
      setStatusMessage(e.message === 'No wedding profile found.'
        ? 'Sync cancelled: You must create a wedding profile first.'
        : 'An error occurred during local demo sync.');
    } finally {
      setIsScanning(false);
      setIsUploading(false);
    }
  };

  const triggerRealSync = async () => {
    if (!googleSession) return;
    setIsScanning(true);
    setSyncStatus('idle');
    setStatusMessage('Connecting to your Google Drive...');

    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) throw new Error('Not logged in. Please restart the app.');
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) {
        Alert.alert('Setup Required', 'You must create a Wedding Profile before you can sync data.', [
          { text: 'Go to Home', onPress: () => router.push('/(tabs)') }
        ]);
        throw new Error('No wedding profile found.');
      }

      const backup = await GoogleDriveService.downloadBackupFromDrive(googleSession.accessToken);
      if (backup) {
        setStatusMessage('Found a backup on your Google Drive! Restoring data...');
        const success = await BackupService.restoreBackup(db, backup);
        setSyncStatus(success ? 'success' : 'error');
        setStatusMessage(success ? 'Successfully synced with your other devices!' : 'Found a backup, but failed to restore it.');
      } else {
        setStatusMessage('No backup found. Creating one on your Google Drive...');
        setIsScanning(false);
        setIsUploading(true);
        const newBackup = await BackupService.createBackup(db, wedding.id);
        const uploaded = await GoogleDriveService.uploadBackupToDrive(googleSession.accessToken, newBackup);
        setSyncStatus(uploaded ? 'success' : 'error');
        setStatusMessage(uploaded ? 'Backed up to your Google Drive! Sign in with the same account on other devices to sync.' : 'Failed to upload backup to Google Drive.');
      }
    } catch (e: any) {
      setSyncStatus('error');
      setStatusMessage('An error occurred while syncing with Google Drive. Your sign-in may have expired — try reconnecting.');
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
            {isConfigured
              ? 'Sign in with your Google Account to back up and sync your wedding data across devices.'
              : 'Google sign-in isn’t configured for this app yet. You can still try local demo sync below, which keys a backup by any email you enter on this device.'}
          </Typography>
        </View>

        {!isConfigured && (
          <View style={styles.demoNotice}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
            <Typography variant="caption" color={theme.colors.textSecondary} style={{ flex: 1, marginLeft: 8 }}>
              Demo mode: no real Google account is used. An admin can enable real Google sync by configuring an OAuth client ID (see src/config/env.ts).
            </Typography>
          </View>
        )}

        {isConfigured ? (
          !googleSession ? (
            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && { opacity: 0.8 }]}
              disabled={!request || isSigningIn}
              onPress={() => promptAsync()}
            >
              {isSigningIn ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                  <Typography variant="body" weight="semibold" style={styles.googleButtonText}>
                    Sign in with Google
                  </Typography>
                </>
              )}
            </Pressable>
          ) : (
            <Card style={styles.card}>
              <View style={styles.accountHeader}>
                <View style={styles.avatar}>
                  <Typography variant="body" weight="bold" color="#FFF">
                    {googleSession.email.charAt(0).toUpperCase()}
                  </Typography>
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="body" weight="semibold">{googleSession.name}</Typography>
                  <Typography variant="caption" color={theme.colors.textSecondary}>{googleSession.email}</Typography>
                </View>
                <Pressable onPress={handleGoogleDisconnect}>
                  <Typography variant="caption" color={theme.colors.primary} weight="semibold">Disconnect</Typography>
                </Pressable>
              </View>

              <Button
                label={isScanning ? 'Scanning Drive...' : isUploading ? 'Uploading...' : 'Sync Now'}
                onPress={triggerRealSync}
                disabled={isScanning || isUploading}
                style={styles.syncBtn}
                icon={isScanning || isUploading ? undefined : 'cloud-upload-outline'}
              />
            </Card>
          )
        ) : !loggedInEmail ? (
          <Button
            label="Try Local Demo Sync"
            variant="outline"
            icon="flask-outline"
            onPress={() => setShowDemoModal(true)}
          />
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
                <Typography variant="caption" color={theme.colors.textSecondary}>Local demo sync key</Typography>
              </View>
              <Pressable onPress={() => { setLoggedInEmail(null); setSyncStatus('idle'); setStatusMessage(''); }}>
                <Typography variant="caption" color={theme.colors.primary} weight="semibold">Disconnect</Typography>
              </Pressable>
            </View>

            <Button
              label={isScanning ? 'Scanning...' : isUploading ? 'Uploading...' : 'Sync Now'}
              onPress={() => triggerDemoSync(loggedInEmail)}
              disabled={isScanning || isUploading}
              style={styles.syncBtn}
              icon={isScanning || isUploading ? undefined : 'cloud-upload-outline'}
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

      {/* Local demo sync modal — plainly labeled, does not imitate Google's own sign-in UI */}
      <Modal visible={showDemoModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalContent} behavior="padding">
            <View style={styles.modalHeader}>
              <View style={styles.demoIconWrapper}>
                <Ionicons name="flask-outline" size={24} color={theme.colors.primary} />
              </View>
              <Typography variant="sectionTitle" weight="bold" style={{ marginTop: 16 }}>Local Demo Sync</Typography>
              <Typography variant="body" color={theme.colors.textSecondary} style={{ marginTop: 4, textAlign: 'center' }}>
                No Google account required — this key just labels a local backup file on this device.
              </Typography>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                label="Sync Key (any email)"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalFooter}>
              <Button label="Cancel" variant="ghost" onPress={() => setShowDemoModal(false)} style={{ flex: 1 }} />
              <Button label="Continue" variant="primary" onPress={handleDemoLoginSubmit} style={{ flex: 1 }} />
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
    marginBottom: theme.spacing.lg,
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
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
  demoIconWrapper: {
    marginBottom: 8,
  },
  modalBody: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.background,
  }
});
