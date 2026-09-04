import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';
import { FinanceService } from '../../../services/finance';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';

export default function EditBudgetScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [budget, setBudget] = useState('');
  const [weddingId, setWeddingId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadBudget() {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) {
          router.back();
          return;
        }
        const wedding = await getUserWedding(db, session.id);
        if (wedding) {
          setWeddingId(wedding.id);
          setBudget(wedding.budget ? wedding.budget.toString() : '');
        }
      } catch (error) {
        Alert.alert('Error', 'Could not load budget data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadBudget();
  }, [db]);

  const handleSave = async () => {
    const numBudget = budget.trim() === '' ? null : parseFloat(budget);
    
    if (numBudget !== null && (isNaN(numBudget) || numBudget < 0)) {
      Alert.alert('Error', 'Please enter a valid positive number for the budget.');
      return;
    }

    setIsSubmitting(true);
    try {
      await FinanceService.updateBudget(db, weddingId, numBudget);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Could not save budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    setIsSubmitting(true);
    try {
      await FinanceService.updateBudget(db, weddingId, null);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Could not clear budget.');
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
      <View style={styles.content}>
        
        <Typography variant="sectionTitle" style={{ marginBottom: spacing.lg }}>
          Total Wedding Budget
        </Typography>

        <Typography variant="body" color={theme.colors.textSecondary} style={{ marginBottom: spacing.xl }}>
          Setting a budget allows you to track your remaining available funds across all vendor payments and general expenses. Leave blank to disable budget tracking.
        </Typography>
        
        <TextInput
          label="Total Budget Amount (₹)"
          placeholder="e.g. 500000"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          autoFocus
        />

        <View style={styles.actions}>
          <Button
            label="Save Budget"
            onPress={handleSave}
            isLoading={isSubmitting}
            style={{ marginBottom: spacing.md }}
          />
          <Button 
            label="Clear Budget" 
            variant="outline"
            onPress={handleClear} 
            disabled={isSubmitting} 
          />
        </View>

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
    padding: spacing.xl,
  },
  actions: {
    marginTop: spacing.xxl,
  }
});
