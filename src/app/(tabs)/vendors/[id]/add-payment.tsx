import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../../components/ui';
import { useTheme } from '../../../../theme/ThemeContext';
import { spacing } from '../../../../theme';
import { PaymentService, PaymentDTO } from '../../../../services/payment';
import { AuthService } from '../../../../services/auth';
import { getUserWedding } from '../../../../services/wedding';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

export default function AddPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // vendor id
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const newErrors: any = {};
    const parsedAmount = parseFloat(amount);
    
    if (!amount.trim()) newErrors.amount = "Amount is required";
    else if (isNaN(parsedAmount) || parsedAmount <= 0) newErrors.amount = "Must be a positive number";
    
    if (!paymentDate.trim()) newErrors.date = "Date is required";

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

      const paymentData: PaymentDTO = {
        amount: parsedAmount,
        payment_date: paymentDate.trim(),
        payment_method: paymentMethod,
        notes: notes.trim(),
      };

      await PaymentService.addPayment(db, wedding.id, id, paymentData);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        <TextInput
          label="Amount Paid (₹) *"
          placeholder="e.g. 5000"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            if (errors.amount) setErrors({ ...errors, amount: '' });
          }}
          error={errors.amount}
          keyboardType="numeric"
          autoFocus
        />

        <TextInput
          label="Payment Date (YYYY-MM-DD) *"
          placeholder="e.g. 2024-12-01"
          value={paymentDate}
          onChangeText={(text) => {
            setPaymentDate(text);
            if (errors.date) setErrors({ ...errors, date: '' });
          }}
          error={errors.date}
        />

        <Typography variant="body" color={theme.colors.textSecondary} style={styles.label}>
          Payment Method *
        </Typography>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method}
              style={[
                styles.methodChip,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                paymentMethod === method && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              onPress={() => setPaymentMethod(method)}
            >
              <Typography 
                variant="caption" 
                weight="medium"
                color={paymentMethod === method ? theme.colors.surface : theme.colors.text}
              >
                {method}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Notes / Transaction ID"
          placeholder="e.g. Adv payment via GPay (Txn: 1234)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <Button
          label="Record Payment"
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
  label: {
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: 0,
  }
});
