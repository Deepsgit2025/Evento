import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button, Card } from '../../../components/ui';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding, updateWedding } from '../../../services/wedding';
import { User, Wedding } from '../../../database/types';
import { SyncEngine } from '../../../services/syncEngine';

export default function WeddingProfileScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [wedding, setWedding] = useState<Wedding | null>(null);

  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [coverPhoto, setCoverPhoto] = useState('');
  const [bridePhoto, setBridePhoto] = useState('');
  const [groomPhoto, setGroomPhoto] = useState('');
  const [city, setCity] = useState('');
  
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let isActive = true;
    const loadProfile = async () => {
      try {
        const sessionUser = await AuthService.getCurrentSession(db);
        if (sessionUser && isActive) {
          setUser(sessionUser);
          setManagerName(sessionUser.name);
          setPhone(sessionUser.phone || '');
          setEmail(sessionUser.email);
          
          const sessionWedding = await getUserWedding(db, sessionUser.id);
          if (sessionWedding && isActive) {
            setWedding(sessionWedding);
            setBrideName(sessionWedding.bride_name);
            setGroomName(sessionWedding.groom_name);
            setDate(sessionWedding.date || '');
            setVenue(sessionWedding.venue || '');
            setCoverPhoto(sessionWedding.cover_photo_uri || '');
            setBridePhoto((sessionWedding as any).bride_photo_uri || '');
            setGroomPhoto((sessionWedding as any).groom_photo_uri || '');
            setCity((sessionWedding as any).city || '');
          }
        }
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    loadProfile();
    return () => { isActive = false; };
  }, [db]);

  const handleSave = async () => {
    if (!user || !wedding) return;
    setIsSaving(true);
    try {
      await db.withTransactionAsync(async () => {
        // Update User
        await AuthService.updateUser(db, user.id, {
          name: managerName,
          phone: phone || null,
          email: email
        });
        
        // Update Wedding
        await updateWedding(db, wedding.id, {
          bride_name: brideName,
          groom_name: groomName,
          date: date || null,
          venue: venue || null,
          cover_photo_uri: coverPhoto || null,
          bride_photo_uri: bridePhoto || null,
          groom_photo_uri: groomPhoto || null,
          city: city || null,
        } as any);
      });
      
      // Mark for sync
      await SyncEngine.markPending(db, 'users', user.id, 'UPDATE');
      await SyncEngine.markPending(db, 'weddings', wedding.id, 'UPDATE');

      Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <ScreenContainer><View /></ScreenContainer>;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Wedding Profile</Typography>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <Card>
          <Typography variant="sectionTitle" style={styles.sectionHeader}>Couple Details</Typography>
          <TextInput label="Bride Name" value={brideName} onChangeText={setBrideName} />
          <TextInput label="Groom Name" value={groomName} onChangeText={setGroomName} />
          <TextInput label="Wedding Date" value={date} onChangeText={setDate} placeholder="e.g. 24 Oct 2026" />
          <TextInput label="Venue" value={venue} onChangeText={setVenue} />
          <TextInput label="Cover Photo URL" value={coverPhoto} onChangeText={setCoverPhoto} placeholder="https://..." />
          <TextInput label="Bride Photo URL" value={bridePhoto} onChangeText={setBridePhoto} placeholder="https://..." />
          <TextInput label="Groom Photo URL" value={groomPhoto} onChangeText={setGroomPhoto} placeholder="https://..." />
          <TextInput label="City" value={city} onChangeText={setCity} placeholder="e.g. Mumbai" />
        </Card>

        <Card>
          <Typography variant="sectionTitle" style={styles.sectionHeader}>Manager Account</Typography>
          <TextInput label="Your Name" value={managerName} onChangeText={setManagerName} />
          <TextInput label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </Card>

      </ScrollView>
      <View style={styles.footer}>
        <Button label="Save Changes" onPress={handleSave} isLoading={isSaving} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  }
});
