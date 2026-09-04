import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { ScreenContainer, Typography, TextInput, Button, Card } from '../../components/ui';
import { theme } from '../../theme';
import { setupAccountAndWedding } from '../../services/wedding';
import { AuthService } from '../../services/auth';

export default function JoinWeddingScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [mode, setMode] = useState<'options' | 'create' | 'join'>('options');
  const [isLoading, setIsLoading] = useState(false);

  // Create state
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [weddingDate, setWeddingDate] = useState('');

  // Join state
  const [inviteCode, setInviteCode] = useState('');

  const handleCreate = async () => {
    if (!brideName || !groomName) {
      Alert.alert('Error', 'Please enter both bride and groom names.');
      return;
    }
    
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) throw new Error('Not authenticated');

      // We pass the session data back into setup to create the wedding
      // Since they are already signed up, we can modify setupAccountAndWedding or just create it directly here.
      // Let's create it directly here for simplicity since they are already a user.
      const weddingId = Crypto.randomUUID();
      const timestamp = Math.floor(Date.now() / 1000);
      
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO weddings (id, bride_name, groom_name, date, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?);`,
          [weddingId, brideName, groomName, weddingDate || null, timestamp, timestamp]
        );
        
        const memberId = Crypto.randomUUID();
        await db.runAsync(
          `INSERT INTO wedding_members (id, user_id, wedding_id, role, created_at) VALUES (?, ?, ?, ?, ?)`,
          [memberId, session.id, weddingId, 'OWNER', timestamp]
        );
      });
      
      // Need to push these changes to sync queue as well
      const { SyncEngine } = await import('../../services/syncEngine');
      await SyncEngine.markPending(db, 'weddings', weddingId, 'CREATE');
      // Sync Engine will sync wedding_members if it's in the table list, but usually RLS handles it.
      
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error(e instanceof Error ? e.message : String(e));
      Alert.alert('Error', e.message || 'Failed to create wedding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode) {
      Alert.alert('Error', 'Please enter an invite code.');
      return;
    }
    Alert.alert('Coming Soon', 'Joining via invite code requires cloud function setup. Currently in development.');
    // Real implementation would hit Supabase edge function to validate code and insert into wedding_members.
  };

  if (mode === 'create') {
    return (
      <ScreenContainer edges={['top', 'bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Typography variant="screenTitle">Create Wedding</Typography>
          </View>
          <Card style={styles.card}>
            <TextInput label="Bride Name" placeholder="e.g. Priya" value={brideName} onChangeText={setBrideName} />
            <TextInput label="Groom Name" placeholder="e.g. Rahul" value={groomName} onChangeText={setGroomName} />
            <TextInput label="Wedding Date" placeholder="e.g. 24 Oct 2026" value={weddingDate} onChangeText={setWeddingDate} />
            <Button label="Create & Continue" onPress={handleCreate} isLoading={isLoading} style={{ marginTop: theme.spacing.lg }} />
            <Button label="Back" variant="ghost" onPress={() => setMode('options')} disabled={isLoading} style={{ marginTop: theme.spacing.md }} />
          </Card>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (mode === 'join') {
    return (
      <ScreenContainer edges={['top', 'bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Typography variant="screenTitle">Join Wedding</Typography>
          </View>
          <Card style={styles.card}>
            <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing.xl, textAlign: 'center' }}>
              Enter the 6-digit invite code provided by the wedding owner or manager.
            </Typography>
            <TextInput label="Invite Code" placeholder="e.g. A8F9X2" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
            <Button label="Join Wedding" onPress={handleJoin} isLoading={isLoading} style={{ marginTop: theme.spacing.lg }} />
            <Button label="Back" variant="ghost" onPress={() => setMode('options')} disabled={isLoading} style={{ marginTop: theme.spacing.md }} />
          </Card>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Typography variant="screenTitle">Welcome to Evento</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            Are you planning your own wedding or joining someone else's?
          </Typography>
        </View>

        <Card style={styles.optionCard}>
          <Typography variant="sectionTitle">Plan a Wedding</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.optionDesc}>
            Create a new wedding profile and start organizing guests, events, and vendors.
          </Typography>
          <Button label="Create New Wedding" onPress={() => setMode('create')} />
        </Card>

        <Card style={styles.optionCard}>
          <Typography variant="sectionTitle">Join a Wedding</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.optionDesc}>
            Access a wedding you've been invited to manage or view.
          </Typography>
          <Button label="Join Existing Wedding" variant="outline" onPress={() => setMode('join')} />
        </Card>
        
        <Button label="Logout" variant="ghost" onPress={async () => {
          await AuthService.signOut(db);
          router.replace('/auth/login');
        }} style={{ marginTop: theme.spacing.xl }} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.xl,
  },
  optionCard: {
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  optionDesc: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  }
});
