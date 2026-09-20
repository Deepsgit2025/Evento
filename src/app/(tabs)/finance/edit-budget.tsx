import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { theme } from '../../../theme';
import { FinanceService } from '../../../services/finance';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';

export default function EditBudgetScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

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

  const handleClear = () => {
    Alert.alert(
      'Clear budget?',
      'This removes the total budget amount. Your expenses and payments are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Budget',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await FinanceService.updateBudget(db, weddingId, null);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Could not clear budget.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScreenContainer>
      <View style={styles.content}>
        
        <Typography variant="sectionTitle" style={{ marginBottom: theme.spacing.lg }}>
          Total Wedding Budget
        </Typography>

        <Typography variant="body" color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing.xl }}>
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

        <View style={[styles.actions, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
          <Button
            label="Save Budget"
            onPress={handleSave}
            isLoading={isSubmitting}
            style={{ marginBottom: theme.spacing.md }}
          />
          <Button
            label="Clear Budget"
            variant="destructive"
            onPress={handleClear}
            disabled={isSubmitting}
          />
        </View>

      </View>
    </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.xl,
  },
  actions: {
    marginTop: theme.spacing.xxl,
  }
});
