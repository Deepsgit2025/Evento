import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';
import { FinanceService, ExpenseDTO } from '../../../services/finance';

const CATEGORIES = ['Decoration', 'Food', 'Travel', 'Clothing', 'Gifts', 'Venue', 'Miscellaneous', 'Custom'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  
  const [categorySelection, setCategorySelection] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadExpense() {
      try {
        const e = await FinanceService.getExpenseById(db, id);
        if (e) {
          setTitle(e.title);
          setAmount(e.amount.toString());
          setDate(e.date);
          
          if (CATEGORIES.includes(e.category)) {
            setCategorySelection(e.category);
          } else {
            setCategorySelection('Custom');
            setCustomCategory(e.category);
          }
          
          setPaymentMethod(e.payment_method);
          setNotes(e.notes || '');
        } else {
          Alert.alert('Error', 'Expense not found.');
          router.back();
        }
      } catch (error) {
        Alert.alert('Error', 'Could not load expense data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadExpense();
  }, [db, id]);

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
      const expenseData: ExpenseDTO = {
        title: title.trim(),
        category: finalCategory,
        amount: parsedAmount,
        date: date.trim(),
        payment_method: paymentMethod,
        notes: notes.trim(),
      };

      await FinanceService.updateExpense(db, id, expenseData);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmAction = async () => {
      try {
        await FinanceService.deleteExpense(db, id);
        router.back();
      } catch (error) {
        Alert.alert('Error', 'Could not delete expense.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm("Delete this expense?")) confirmAction();
    } else {
      Alert.alert("Delete Expense", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmAction }
      ]);
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
        
        <TextInput
          label="Expense Title *"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title) setErrors({ ...errors, title: '' });
          }}
          error={errors.title}
        />

        <TextInput
          label="Amount Spent (₹) *"
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
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                categorySelection === cat && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
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
            value={customCategory}
            onChangeText={(text) => {
              setCustomCategory(text);
              if (errors.category) setErrors({ ...errors, category: '' });
            }}
            error={errors.category}
          />
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

        <Typography variant="body" color={theme.colors.textSecondary} style={styles.label}>
          Payment Method *
        </Typography>
        <View style={styles.grid}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method}
              style={[
                styles.chip,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                paymentMethod === method && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
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
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />

        <Button
          label="Delete Expense"
          variant="outline"
          onPress={handleDelete}
          style={{marginTop: spacing.lg, borderColor: theme.colors.error}}
        />

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <Button
          label="Update Expense"
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
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
