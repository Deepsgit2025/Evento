import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../../components/ui';
import { theme } from '../../../../theme';
import { VendorService, VendorDTO } from '../../../../services/vendor';

const PRESET_CATEGORIES = [
  'Photography', 'Videography', 'Decoration', 'Mehndi', 'Makeup', 
  'Catering', 'DJ/Music', 'Choreography', 'Baraat', 'Pandit', 
  'Venue', 'Flowers', 'Invitations', 'Transportation', 'Other'
];

export default function EditVendorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [name, setName] = useState('');
  const [categorySelection, setCategorySelection] = useState('');
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVendor() {
      try {
        const v = await VendorService.getVendorById(db, id);
        if (v) {
          setName(v.name);
          
          if (PRESET_CATEGORIES.includes(v.category)) {
            setCategorySelection(v.category);
          } else {
            setCategorySelection('Other');
            setCustomCategory(v.category);
          }

          setContactPerson(v.contact_person || '');
          setPhone(v.phone || '');
          setAlternatePhone(v.alternate_phone || '');
          setEmail(v.email || '');
          setAddress(v.address || '');
          setNotes(v.notes || '');
          setAgreedAmount(v.agreed_amount ? v.agreed_amount.toString() : '');
        } else {
          Alert.alert('Error', 'Vendor not found.');
          router.back();
        }
      } catch (error) {
        Alert.alert('Error', 'Could not load vendor data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadVendor();
  }, [db, id]);

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

      await VendorService.updateVendor(db, id, vendorData);
      router.back();
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      Alert.alert('Error', 'Could not update vendor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

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
                categorySelection === cat && styles.categoryChipActive
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

        <View style={styles.divider} />
        
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

        <View style={styles.divider} />
        
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

      <View style={styles.footer}>
        <Button 
          label="Update Vendor" 
          onPress={handleSave} 
          isLoading={isSubmitting} 
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.xl,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    backgroundColor: theme.colors.background,
  }
});
