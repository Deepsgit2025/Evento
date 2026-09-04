import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';
import { VendorService, VendorDTO } from '../../../services/vendor';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';

const PRESET_CATEGORIES = [
  'Photography', 'Videography', 'Decoration', 'Mehndi', 'Makeup', 
  'Catering', 'DJ/Music', 'Choreography', 'Baraat', 'Pandit', 
  'Venue', 'Flowers', 'Invitations', 'Transportation', 'Other'
];

export default function AddVendorScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [categorySelection, setCategorySelection] = useState(PRESET_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [agreedAmount, setAgreedAmount] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    // Validation
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = "Vendor name is required";
    
    const finalCategory = categorySelection === 'Other' ? customCategory.trim() : categorySelection;
    if (!finalCategory) newErrors.category = "Category is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) throw new Error("No active session");
      
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) throw new Error("No active workspace");

      const vendorData: VendorDTO = {
        name: name.trim(),
        category: finalCategory,
        contact_person: contactPerson.trim(),
        phone: phone.trim(),
        alternate_phone: alternatePhone.trim(),
        email: email.trim(),
        address: address.trim(),
        notes: notes.trim(),
        agreed_amount: parseFloat(agreedAmount) || 0,
      };

      await VendorService.addVendor(db, wedding.id, vendorData);
      router.back();
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      Alert.alert('Error', 'Could not save vendor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Required Information</Typography>
        
        <TextInput
          label="Vendor/Business Name *"
          placeholder="e.g. Dream Weddings Photography"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          error={errors.name}
        />

        <Typography variant="body" color={theme.colors.textSecondary} style={styles.label}>
          Category *
        </Typography>
        <View style={styles.categoryGrid}>
          {PRESET_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                categorySelection === cat && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              onPress={() => {
                setCategorySelection(cat);
                if (errors.category) setErrors({ ...errors, category: '' });
              }}
            >
              <Typography 
                variant="caption" 
                weight="medium"
                color={categorySelection === cat ? theme.colors.surface : theme.colors.text}
              >
                {cat}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>

        {categorySelection === 'Other' && (
          <TextInput
            label="Custom Category Name *"
            placeholder="e.g. Drone Operator"
            value={customCategory}
            onChangeText={(text) => {
              setCustomCategory(text);
              if (errors.category) setErrors({ ...errors, category: '' });
            }}
            error={errors.category}
          />
        )}

        <TextInput
          label="Agreed Amount (₹) *"
          placeholder="e.g. 50000"
          value={agreedAmount}
          onChangeText={(text) => {
            setAgreedAmount(text);
          }}
          keyboardType="numeric"
        />

        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
        
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Contact Information (Optional)</Typography>

        <TextInput
          label="Contact Person"
          placeholder="e.g. Rahul Sharma"
          value={contactPerson}
          onChangeText={setContactPerson}
        />

        <TextInput
          label="Phone Number"
          placeholder="e.g. +91 98765 43210"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Alternate Phone"
          placeholder="e.g. 011-2345678"
          value={alternatePhone}
          onChangeText={setAlternatePhone}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Email Address"
          placeholder="e.g. contact@vendor.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Business Address"
          placeholder="e.g. 123 Main St, Mumbai"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={2}
        />

        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
        
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Additional Details</Typography>

        <TextInput
          label="Notes"
          placeholder="Any special instructions or terms..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <Button
          label="Save Vendor"
          onPress={handleSave} 
          isLoading={isSubmitting} 
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: 0,
  }
});
