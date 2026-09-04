import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, EmptyState, TextInput, Card, Button } from '../../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { AuthService } from '../../../../services/auth';
import { getUserWedding } from '../../../../services/wedding';
import { GuestService } from '../../../../services/guest';
import { GroupService } from '../../../../services/group';
import { EventGuestService } from '../../../../services/eventGuest';
import { Guest, GuestGroup } from '../../../../database/types';

export default function EventManageGuestsScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [weddingId, setWeddingId] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [initialAttendingIds, setInitialAttendingIds] = useState<Set<string>>(new Set());
  
  // Local state for what is currently selected (will be saved on 'Save')
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<'All' | 'Groom' | 'Bride' | 'Attending'>('All');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      setWeddingId(wedding.id);

      const [fetchedGuests, fetchedGroups, attendingGuests] = await Promise.all([
        debouncedSearch.trim() ? GuestService.searchGuests(db, wedding.id, debouncedSearch) : GuestService.getGuests(db, wedding.id),
        GroupService.getGroups(db, wedding.id, 'All'),
        EventGuestService.getGuestsForEvent(db, eventId as string)
      ]);
      
      const attendingIds = new Set(attendingGuests.map(g => g.id));
      
      setGuests(fetchedGuests);
      setGroups(fetchedGroups);
      setInitialAttendingIds(attendingIds);
      
      // Initialize selected set from DB only on first load
      if (isLoading) {
        setSelectedGuestIds(attendingIds);
      }
      
    } catch (error) {
      console.error("Failed to fetch data", error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [db, eventId, debouncedSearch, isLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSideFilter = (side: 'All' | 'Groom' | 'Bride' | 'Attending') => {
    setSideFilter(side);
    setGroupFilter(null);
  };

  const handleGroupFilter = (groupId: string) => {
    if (groupFilter === groupId) {
      setGroupFilter(null);
    } else {
      setGroupFilter(groupId);
      const group = groups.find(g => g.id === groupId);
      if (group) setSideFilter(group.side as any);
    }
  };

  const toggleGuestSelection = (guestId: string) => {
    const next = new Set(selectedGuestIds);
    if (next.has(guestId)) next.delete(guestId);
    else next.add(guestId);
    setSelectedGuestIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedGuestIds);
    filteredGuests.forEach(g => next.add(g.id));
    setSelectedGuestIds(next);
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedGuestIds);
    filteredGuests.forEach(g => next.delete(g.id));
    setSelectedGuestIds(next);
  };

  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      let matchesMain = false;
      if (sideFilter === 'All') matchesMain = true;
      else if (sideFilter === 'Attending') matchesMain = selectedGuestIds.has(g.id);
      else matchesMain = g.side === sideFilter;

      const matchesGroup = !groupFilter || g.group_id === groupFilter;
      return matchesMain && matchesGroup;
    });
  }, [guests, sideFilter, groupFilter, selectedGuestIds]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const addedIds = Array.from(selectedGuestIds).filter(id => !initialAttendingIds.has(id));
      const removedIds = Array.from(initialAttendingIds).filter(id => !selectedGuestIds.has(id));

      if (addedIds.length > 0) {
        await EventGuestService.bulkAddGuests(db, weddingId, eventId as string, addedIds);
      }
      if (removedIds.length > 0) {
        await EventGuestService.bulkRemoveGuests(db, eventId as string, removedIds);
      }

      router.back();
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      setIsSaving(false);
    }
  };

  const renderGuest = ({ item }: { item: Guest }) => {
    const group = groups.find(g => g.id === item.group_id);
    const isSelected = selectedGuestIds.has(item.id);

    return (
      <Pressable onPress={() => toggleGuestSelection(item.id)}>
        <Card style={[styles.guestCard, isSelected && styles.guestCardSelected]}>
          <View style={styles.cardContent}>
            <View style={styles.checkbox}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={{flex: 1}}>
              <View style={styles.guestHeader}>
                <View style={styles.guestNameContainer}>
                  <Typography variant="body" weight="semibold">{item.full_name}</Typography>
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    Party of {item.party_size}
                  </Typography>
                </View>
              </View>
              <View style={{flexDirection: 'row', gap: 6, marginTop: 4}}>
                {item.side === 'Groom' ? (
                  <View style={[styles.badge, {backgroundColor: '#E0F2FE'}]}>
                    <Typography variant="caption" weight="medium" style={{color: '#0369A1'}}>Groom Side</Typography>
                  </View>
                ) : (
                  <View style={[styles.badge, {backgroundColor: '#FCE7F3'}]}>
                    <Typography variant="caption" weight="medium" style={{color: '#BE185D'}}>Bride Side</Typography>
                  </View>
                )}
                {group && (
                  <View style={[styles.badge, {backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border}]}>
                    <Typography variant="caption" weight="medium" color={theme.colors.textSecondary}>{group.name}</Typography>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  const FilterPill = ({ label, isActive, onPress }: { label: string, isActive: boolean, onPress: () => void }) => (
    <Pressable 
      style={[styles.filterPill, isActive && styles.filterPillActive]}
      onPress={onPress}
    >
      <Typography 
        variant="caption" 
        weight={isActive ? "semibold" : "medium"}
        color={isActive ? theme.colors.surface : theme.colors.textSecondary}
      >
        {label}
      </Typography>
    </Pressable>
  );

  if (isLoading && guests.length === 0) {
    return (
      <ScreenContainer style={{justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.searchContainer}>
        <TextInput 
          placeholder="Search by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          <FilterPill label="All Guests" isActive={sideFilter === 'All'} onPress={() => handleSideFilter('All')} />
          <FilterPill label="Selected" isActive={sideFilter === 'Attending'} onPress={() => handleSideFilter('Attending')} />
          <FilterPill label="Groom's Side" isActive={sideFilter === 'Groom'} onPress={() => handleSideFilter('Groom')} />
          <FilterPill label="Bride's Side" isActive={sideFilter === 'Bride'} onPress={() => handleSideFilter('Bride')} />
          
          <View style={styles.filterDivider} />
          
          {groups.sort((a,b) => a.sort_order - b.sort_order).map(group => (
            <FilterPill 
              key={group.id} 
              label={group.name} 
              isActive={groupFilter === group.id} 
              onPress={() => handleGroupFilter(group.id)} 
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.bulkActions}>
        <Pressable onPress={selectAllFiltered} style={{marginRight: 16}}>
          <Typography variant="body" weight="semibold" color={theme.colors.primary}>Select All</Typography>
        </Pressable>
        <Pressable onPress={deselectAllFiltered}>
          <Typography variant="body" weight="semibold" color={theme.colors.error}>Deselect All</Typography>
        </Pressable>
      </View>

      {filteredGuests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState icon={<Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />} title="No guests found" />
        </View>
      ) : (
        <FlatList
          data={filteredGuests}
          keyExtractor={(item) => item.id}
          renderItem={renderGuest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <Typography variant="body" weight="medium">
          {selectedGuestIds.size} guests selected
        </Typography>
        <Button label={isSaving ? "Saving..." : "Save Selection"} onPress={handleSave} disabled={isSaving} style={{minWidth: 150}} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  filterScrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
  bulkActions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
  },
  guestCard: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  guestCardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primary + '10',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  guestNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});
