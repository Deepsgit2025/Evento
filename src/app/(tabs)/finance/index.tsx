import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, ListItem, TextInput } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { FinanceService, OverallFinancialSummary } from '../../../services/finance';
import { Expense } from '../../../database/types';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';

const CATEGORIES = ['All', 'Decoration', 'Food', 'Travel', 'Clothing', 'Gifts', 'Venue', 'Miscellaneous', 'Custom'];

export default function FinancialDashboardScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [summary, setSummary] = useState<OverallFinancialSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadData = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      const sum = await FinanceService.getOverallFinancialSummary(db, wedding.id);
      const exps = await FinanceService.getExpenses(db, wedding.id);
      
      setSummary(sum);
      setExpenses(exps);
      setFilteredExpenses(exps);
      // Re-apply filters if any exist
      applyFilters(exps, searchQuery, selectedCategory);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const applyFilters = (data: Expense[], search: string, category: string) => {
    let filtered = data;
    if (category !== 'All') {
      filtered = filtered.filter(e => e.category === category);
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(query) || 
        (e.notes && e.notes.toLowerCase().includes(query)) ||
        e.date.includes(query)
      );
    }
    setFilteredExpenses(filtered);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(expenses, text, selectedCategory);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    applyFilters(expenses, searchQuery, category);
  };

  const formatMoney = (amount: number) => `₹${amount.toLocaleString()}`;

  if (!summary) return null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          <Typography variant="body" color={theme.colors.primary}>Home</Typography>
        </TouchableOpacity>
        <Typography variant="screenTitle" style={{flex: 1, textAlign: 'center', marginRight: 40}}>Finance</Typography>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        
        {/* Budget Card */}
        <Card style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Typography variant="sectionTitle">Total Budget</Typography>
            <TouchableOpacity onPress={() => router.push('/(tabs)/finance/edit-budget')}>
              <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {summary.budget !== null ? (
            <View>
              <Typography variant="screenTitle" style={styles.budgetValue}>{formatMoney(summary.budget)}</Typography>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, (summary.totalSpend / summary.budget) * 100)}%`,
                        backgroundColor: summary.remainingBudget! < 0 ? theme.colors.error : theme.colors.primary
                      }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.budgetStatsRow}>
                <View>
                  <Typography variant="caption" color={theme.colors.textSecondary}>Spent</Typography>
                  <Typography variant="body" weight="semibold">{formatMoney(summary.totalSpend)}</Typography>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Typography variant="caption" color={theme.colors.textSecondary}>Remaining</Typography>
                  <Typography 
                    variant="body" 
                    weight="semibold"
                    color={summary.remainingBudget! < 0 ? theme.colors.error : theme.colors.success}
                  >
                    {summary.remainingBudget! < 0 ? `Over by ${formatMoney(Math.abs(summary.remainingBudget!))}` : formatMoney(summary.remainingBudget!)}
                  </Typography>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyBudget}>
              <Typography variant="body" color={theme.colors.textSecondary} align="center" style={{marginBottom: theme.spacing.md}}>
                You haven't set a total budget yet.
              </Typography>
              <Button label="Set Budget" variant="outline" onPress={() => router.push('/(tabs)/finance/edit-budget')} />
            </View>
          )}
        </Card>

        {/* Breakdown Card */}
        <Typography variant="sectionTitle" style={styles.sectionTitle}>Breakdown</Typography>
        <Card style={styles.breakdownCard}>
          
          <View style={styles.breakdownRow}>
            <View style={styles.iconBox}>
              <Ionicons name="briefcase" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.breakdownText}>
              <Typography variant="body" weight="medium">Vendors ({summary.vendorCount})</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>Agreed: {formatMoney(summary.vendorAgreedTotal)}</Typography>
            </View>
            <View style={styles.breakdownValues}>
              <Typography variant="body" weight="bold">{formatMoney(summary.vendorPaidTotal)}</Typography>
              {summary.vendorPendingTotal > 0 ? (
                <Typography variant="caption" color={theme.colors.warning}>{formatMoney(summary.vendorPendingTotal)} pending</Typography>
              ) : summary.vendorPendingTotal < 0 ? (
                <Typography variant="caption" color={theme.colors.error}>Overpaid {formatMoney(Math.abs(summary.vendorPendingTotal))}</Typography>
              ) : (
                <Typography variant="caption" color={theme.colors.success}>All settled</Typography>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.iconBox}>
              <Ionicons name="cart" size={24} color="#E09F3E" />
            </View>
            <View style={styles.breakdownText}>
              <Typography variant="body" weight="medium">General Expenses</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>{expenses.length} records</Typography>
            </View>
            <View style={styles.breakdownValues}>
              <Typography variant="body" weight="bold">{formatMoney(summary.generalExpensesTotal)}</Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>Total</Typography>
            </View>
          </View>

        </Card>

        {/* General Expenses Section */}
        <View style={styles.expensesHeaderRow}>
          <Typography variant="sectionTitle">General Expenses</Typography>
          <TouchableOpacity onPress={() => router.push('/(tabs)/finance/add-expense')}>
            <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Search expenses by title or date..."
          value={searchQuery}
          onChangeText={handleSearch}
          leftIcon={<Ionicons name="search" size={20} color={theme.colors.textSecondary} />}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => handleCategorySelect(cat)}
            >
              <Typography 
                variant="caption" 
                weight="medium"
                color={selectedCategory === cat ? theme.colors.surface : theme.colors.text}
              >
                {cat}
              </Typography>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredExpenses.length > 0 ? (
          <Card style={styles.listCard}>
            {filteredExpenses.map(expense => (
              <ListItem 
                key={expense.id}
                title={expense.title}
                subtitle={`${expense.date} · ${expense.category}`}
                leftElement={
                  <View style={styles.miniIconBox}>
                    <Ionicons name="cart" size={16} color={theme.colors.textSecondary} />
                  </View>
                }
                rightElement={
                  <View style={{alignItems: 'flex-end'}}>
                    <Typography variant="body" weight="semibold">{formatMoney(expense.amount)}</Typography>
                    <Typography variant="caption" color={theme.colors.textSecondary}>{expense.payment_method}</Typography>
                  </View>
                }
                onPress={() => router.push(`/(tabs)/finance/edit-expense?id=${expense.id}` as any)}
              />
            ))}
          </Card>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={48} color={theme.colors.border} style={{marginBottom: 16}} />
            <Typography variant="body" color={theme.colors.textSecondary} align="center">
              No general expenses found.
            </Typography>
          </View>
        )}

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  budgetCard: {
    marginBottom: theme.spacing.xl,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  budgetValue: {
    marginBottom: theme.spacing.lg,
  },
  progressContainer: {
    marginBottom: theme.spacing.md,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyBudget: {
    paddingVertical: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  breakdownCard: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  miniIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownText: {
    flex: 1,
  },
  breakdownValues: {
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  expensesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  filterScroll: {
    marginBottom: theme.spacing.lg,
  },
  filterContent: {
    gap: theme.spacing.sm,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  }
});
