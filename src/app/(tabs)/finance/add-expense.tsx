import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { theme } from '../../../theme';
import { FinanceService, ExpenseDTO } from '../../../services/finance';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';

const CATEGORIES = ['Decoration', 'Food', 'Travel', 'Clothing', 'Gifts', 'Venue', 'Miscellaneous', 'Custom'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

export default function AddExpenseScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [categorySelection, setCategorySelection] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const newErrors: any = {};
    const parsedAmount = parseFloat(amount);
    
    if (!title.trim()) newErrors.title = "Title is required";
    if (!amount.trim()) newErrors.amount = "Amount is required";
    else if (isNaN(parsedAmount) || parsedAmount <= 0) newErrors.amount = "Must be a positive number";
    
    if (!date.trim()) newErrors.date = "Date is required";
    
    const finalCategory = categorySelection === 'Custom' ? customCategory.trim() : categorySelection;
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

      const expenseData: ExpenseDTO = {
        title: title.trim(),
        category: finalCategory,
        amount: parsedAmount,
        date: date.trim(),
        payment_method: paymentMethod,
        notes: notes.trim(),
      };

      await FinanceService.addExpense(db, wedding.id, expenseData);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        <TextInput
          label="Expense Title *"
          placeholder="e.g. Flight Tickets"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title) setErrors({ ...errors, title: '' });
          }}
          error={errors.title}
        />

        <TextInput
          label="Amount Spent (₹) *"
          placeholder="e.g. 15000"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            if (errors.amount) setErrors({ ...errors, amount: '' });
          }}
          error={errors.amount}
          keyboardType="numeric"
        />

        <TextInput
          label="Date (YYYY-MM-DD) *"
          value={date}
          onChangeText={(text) => {
            setDate(text);
            if (errors.date) setErrors({ ...errors, date: '' });
          }}
          error={errors.date}
        />

        <Typography variant="body" color={theme.colors.textSecondary} style={styles.label}>
          Category *
        </Typography>
        <View style={styles.grid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                categorySelection === cat && styles.chipActive
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

        {categorySelection === 'Custom' && (
          <TextInput
            label="Custom Category Name *"
            placeholder="e.g. Logistics"
            value={customCategory}
            onChangeText={(text) => {
              setCustomCategory(text);
              if (errors.category) setErrors({ ...errors, category: '' });
            }}
            error={errors.category}
          />
        )}

        <View style={styles.divider} />

        <Typography variant="body" color={theme.colors.textSecondary} style={styles.label}>
          Payment Method *
        </Typography>
        <View style={styles.grid}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method}
              style={[
                styles.chip,
                paymentMethod === method && styles.chipActive
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
          label="Notes"
          placeholder="Optional details..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />

      </ScrollView>

      <View style={styles.footer}>
        <Button 
          label="Save Expense" 
          onPress={handleSave} 
          isLoading={isSubmitting} 
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  label: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
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
