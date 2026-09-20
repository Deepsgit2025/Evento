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
import { BaraatService } from '../../../services/baraat';

export default function AddBaraatTripScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [capacity, setCapacity] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
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
    if (!vehicle.trim()) { setError('Vehicle is required.'); return; }

    setIsSaving(true);
    setError(null);
    try {
      await BaraatService.addTrip(db, weddingId, {
        vehicle: vehicle.trim(),
        driver_name: driverName.trim() || undefined,
        driver_phone: driverPhone.trim() || undefined,
        pickup_location: pickupLocation.trim() || undefined,
        destination: destination.trim() || undefined,
        capacity: capacity.trim() ? parseInt(capacity, 10) : undefined,
        estimated_arrival: estimatedArrival.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Failed to add vehicle.');
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
          <Typography variant="sectionTitle">Add Vehicle</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error && (
            <Typography variant="caption" color={theme.colors.error} style={{ marginBottom: theme.spacing.md }}>{error}</Typography>
          )}
          <TextInput label="Vehicle *" placeholder="e.g. White Horse Buggy, Car #1" value={vehicle} onChangeText={setVehicle} />
          <TextInput label="Driver Name" placeholder="e.g. Ramesh" value={driverName} onChangeText={setDriverName} />
          <TextInput label="Driver Phone" placeholder="+91 98765 43210" value={driverPhone} onChangeText={setDriverPhone} keyboardType="phone-pad" />
          <TextInput label="Pickup Location" placeholder="e.g. Groom's residence" value={pickupLocation} onChangeText={setPickupLocation} />
          <TextInput label="Destination" placeholder="e.g. Wedding venue" value={destination} onChangeText={setDestination} />
          <TextInput label="Capacity" placeholder="Number of people" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
          <TextInput label="Estimated arrival" placeholder="e.g. 6:30 PM" value={estimatedArrival} onChangeText={setEstimatedArrival} />
          <TextInput label="Notes" placeholder="Any extra details" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + theme.spacing.lg }]}>
          <Button label={isSaving ? 'Saving...' : 'Save Vehicle'} onPress={handleSave} disabled={isSaving || !weddingId} />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  content: { padding: 16, paddingBottom: 32 },
  footer: { padding: 16, borderTopWidth: 1 },
});
