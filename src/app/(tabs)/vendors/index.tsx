import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, EmptyState, SearchInput, Button, ListItem, Badge } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { VendorService } from '../../../services/vendor';
import { Vendor, Wedding } from '../../../database/types';

export default function VendorsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchVendors = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      
      const userWedding = await getUserWedding(db, session.id);
      if (!userWedding) return;
      
      setWedding(userWedding);
      
      const v = await VendorService.getVendors(db, userWedding.id, searchQuery, selectedCategory);
      setVendors(v);
      
      const c = await VendorService.getAvailableCategories(db, userWedding.id);
      setCategories(c);
      
    } catch (error) {
      console.error('Failed to load vendors', error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [db, searchQuery, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchVendors();
    }, [fetchVendors])
  );

  const renderCategoryFilters = () => {
    if (categories.length === 0) return null;
    
    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, selectedCategory === 'All' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('All')}
          >
            <Typography 
              variant="caption" 
              weight="medium"
              color={selectedCategory === 'All' ? theme.colors.surface : theme.colors.text}
            >
              All
            </Typography>
          </TouchableOpacity>
          
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
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
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Typography variant="screenTitle">Vendors</Typography>
      <View style={styles.searchRow}>
        <View style={styles.searchWrapper}>
          <SearchInput 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search vendors..."
          />
        </View>
        <Button 
          variant="primary" 
          label=""
          leftIcon={<Ionicons name="add" size={20} color={theme.colors.surface} />} 
          onPress={() => router.push('/(tabs)/vendors/add' as any)}
          style={styles.addButton}
        />
      </View>
      {renderCategoryFilters()}
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (vendors.length === 0 && searchQuery === '' && selectedCategory === 'All') {
    return (
      <ScreenContainer>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="briefcase-outline" size={48} color={theme.colors.border} />}
            title="No vendors added yet"
            description="Keep every wedding service and supplier organized in one place."
            actionLabel="+ Add Vendor"
            onAction={() => router.push('/(tabs)/vendors/add')}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {renderHeader()}
      
      <FlatList
        data={vendors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={item.contact_person || item.category}
            leftElement={
              <View style={styles.iconContainer}>
                <Ionicons name="briefcase" size={20} color={theme.colors.primary} />
              </View>
            }
            rightElement={
              <Badge label={item.category} variant="default" />
            }
            onPress={() => router.push(`/(tabs)/vendors/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Typography variant="body" color={theme.colors.textSecondary} align="center">
              No vendors match your search.
            </Typography>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: 0,
    backgroundColor: theme.colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchWrapper: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  filterScroll: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15', // 15% opacity primary
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  }
});
