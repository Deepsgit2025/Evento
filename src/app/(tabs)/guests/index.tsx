import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable, ScrollView, Alert, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer, Typography, EmptyState, TextInput, Card, Button } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { GuestService } from '../../../services/guest';
import { GroupService } from '../../../services/group';
import { RoomAssignmentService } from '../../../services/roomAssignment';
import { PatrikaService } from '../../../services/patrika';
import { Guest, GuestGroup } from '../../../database/types';

type AdvancedFilter = 'All' | 'Groom' | 'Bride' | 'NeedsRoom' | 'HasRoom' | 'Invited' | 'NotInvited' | 'RSVP_Attending' | 'RSVP_Pending';

export default function GuestsListScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [weddingId, setWeddingId] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [unassignedGuestIds, setUnassignedGuestIds] = useState<Set<string>>(new Set());
  const [invitedGuestIds, setInvitedGuestIds] = useState<Set<string>>(new Set());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [mainFilter, setMainFilter] = useState<AdvancedFilter>('All');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Bulk Selection State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;

      setWeddingId(wedding.id);

      const [fetchedGuests, fetchedGroups, unassignedGuestsList, allRecipients] = await Promise.all([
        debouncedSearch.trim() ? GuestService.searchGuests(db, wedding.id, debouncedSearch) : GuestService.getGuests(db, wedding.id),
        GroupService.getGroups(db, wedding.id, 'All'),
        RoomAssignmentService.getUnassignedGuests(db, wedding.id),
        PatrikaService.getAllRecipientsForWedding(db, wedding.id)
      ]);
      
      setGuests(fetchedGuests);
      setGroups(fetchedGroups);
      setUnassignedGuestIds(new Set(unassignedGuestsList.map((g: Guest) => g.id)));
      setInvitedGuestIds(new Set(allRecipients.map((r: any) => r.guest_id)));
      
    } catch (error) {
      console.error("Failed to fetch guests", error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [db, debouncedSearch]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleMainFilter = (filter: AdvancedFilter) => {
    setMainFilter(filter);
    setGroupFilter(null);
  };

  const handleGroupFilter = (groupId: string) => {
    if (groupFilter === groupId) {
      setGroupFilter(null);
    } else {
      setGroupFilter(groupId);
      const group = groups.find(g => g.id === groupId);
      if (group) setMainFilter(group.side as AdvancedFilter);
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedGuestIds(new Set());
  };

  const toggleGuestSelection = (id: string) => {
    const next = new Set(selectedGuestIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedGuestIds(next);
  };

  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      let matchesMain = false;
      switch (mainFilter) {
        case 'All': matchesMain = true; break;
        case 'Groom': matchesMain = g.side === 'Groom'; break;
        case 'Bride': matchesMain = g.side === 'Bride'; break;
        case 'NeedsRoom': matchesMain = unassignedGuestIds.has(g.id); break;
        case 'HasRoom': matchesMain = !unassignedGuestIds.has(g.id); break;
        case 'Invited': matchesMain = invitedGuestIds.has(g.id); break;
        case 'NotInvited': matchesMain = !invitedGuestIds.has(g.id); break;
        case 'RSVP_Attending': matchesMain = g.rsvp_status === 'ATTENDING'; break;
        case 'RSVP_Pending': matchesMain = g.rsvp_status === 'PENDING'; break;
      }
      const matchesGroup = !groupFilter || g.group_id === groupFilter;
      return matchesMain && matchesGroup;
    });
  }, [guests, mainFilter, groupFilter, unassignedGuestIds, invitedGuestIds]);

  const totalGuests = guests.length;
  const totalPeople = guests.reduce((acc, g) => acc + g.party_size, 0);
  const groomSidePeople = guests.filter(g => g.side === 'Groom').reduce((acc, g) => acc + g.party_size, 0);
  const brideSidePeople = guests.filter(g => g.side === 'Bride').reduce((acc, g) => acc + g.party_size, 0);
  const attendingPeople = guests.filter(g => g.rsvp_status === 'ATTENDING').reduce((acc, g) => acc + g.party_size, 0);
  const pendingGuests = guests.filter(g => g.rsvp_status === 'PENDING').length;

  const handleBulkMoveToGroup = async (groupId: string | null) => {
    setShowGroupModal(false);
    if (selectedGuestIds.size === 0) return;
    
    try {
      const targetGroup = groups.find(g => g.id === groupId);
      await GuestService.bulkAssignGroup(db, Array.from(selectedGuestIds), groupId, targetGroup?.side);
      setSelectedGuestIds(new Set());
      setIsSelectMode(false);
      await fetchData();
      Alert.alert('Success', 'Guests moved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to move guests');
    }
  };

  const renderGuest = ({ item }: { item: Guest }) => {
    const group = groups.find(g => g.id === item.group_id);
    const isSelected = selectedGuestIds.has(item.id);

    return (
      <Pressable 
        onPress={() => isSelectMode ? toggleGuestSelection(item.id) : router.push(`/(tabs)/guests/${item.id}`)}
      >
        <Card style={[styles.guestCard, isSelected && [styles.guestCardSelected, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }]]}>
          <View style={styles.cardContent}>
            {isSelectMode && (
              <View style={[styles.checkbox, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            )}
            <View style={{flex: 1}}>
              <View style={styles.guestHeader}>
                <View style={styles.guestNameContainer}>
                  <Typography variant="body" weight="semibold">{item.full_name}</Typography>
                  {item.side === 'Groom' ? (
                    <View style={[styles.badge, styles.badgeGroom]}>
                      <Typography variant="caption" weight="medium" style={styles.badgeTextGroom}>Groom Side</Typography>
                    </View>
                  ) : (
                    <View style={[styles.badge, styles.badgeBride]}>
                      <Typography variant="caption" weight="medium" style={styles.badgeTextBride}>Bride Side</Typography>
                    </View>
                  )}
                  {group && (
                    <View style={[styles.badge, styles.badgeGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <Typography variant="caption" weight="medium" style={[styles.badgeTextGroup, { color: theme.colors.textSecondary }]}>{group.name}</Typography>
                    </View>
                  )}
                </View>
                <Typography variant="caption" color={theme.colors.textSecondary}>
                  Party of {item.party_size}
                </Typography>
              </View>
              
              {item.phone && (
                <View style={styles.guestDetailRow}>
                  <Ionicons name="call-outline" size={14} color={theme.colors.textMuted} />
                  <Typography variant="caption" color={theme.colors.textSecondary} style={styles.detailText}>
                    {item.phone}
                  </Typography>
                </View>
              )}
              
              <View style={styles.guestDetailRow}>
                 <Ionicons name="mail-outline" size={14} color={theme.colors.textMuted} />
                 <Typography variant="caption" color={theme.colors.textSecondary} style={styles.detailText}>
                   {item.rsvp_status === 'PENDING' ? 'Not responded' : 
                    item.rsvp_status === 'ATTENDING' ? 'Attending' : 
                    item.rsvp_status === 'MAYBE' ? 'Maybe' : 'Not attending'}
                 </Typography>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  const FilterPill = ({ label, isActive, onPress }: { label: string, isActive: boolean, onPress: () => void }) => (
    <Pressable
      style={[
        styles.filterPill,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        isActive && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
      ]}
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

  const renderEmptyState = () => {
    if (debouncedSearch) {
      return <EmptyState icon={<Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />} title="No matching guests" />;
    }
    if (filteredGuests.length === 0 && mainFilter !== 'All') {
      return <EmptyState icon={<Ionicons name="funnel-outline" size={48} color={theme.colors.textMuted} />} title="No guests match this filter" />;
    }
    return (
      <EmptyState
        icon={<Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />}
        title="Your guest list is empty"
        actionLabel="Add First Guest"
        onAction={() => router.push('/(tabs)/guests/add')}
      />
    );
  };

  if (isLoading && guests.length === 0) return null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Typography variant="sectionTitle">Guests</Typography>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/guests/groups-manager' as any)}>
            <Ionicons name="folder" size={24} color={theme.colors.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={toggleSelectMode}>
            <Ionicons name="checkmark-circle" size={24} color={isSelectMode ? theme.colors.success : theme.colors.primary} />
          </Pressable>
          <Pressable style={[styles.addButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => router.push('/(tabs)/guests/add')}>
            <Ionicons name="add" size={20} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dashboardScroll}>
        <Card style={styles.dashCard}>
          <Typography variant="caption" color={theme.colors.textSecondary}>Total</Typography>
          <Typography variant="display" weight="bold">{totalPeople}</Typography>
          <Typography variant="caption" color={theme.colors.textSecondary}>{totalGuests} records</Typography>
        </Card>
        
        <Card style={styles.dashCard}>
          <Typography variant="caption" color={theme.colors.textSecondary}>Side</Typography>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4}}>
            <View style={[styles.badge, styles.badgeGroom, {paddingVertical: 4}]}>
              <Typography variant="caption" weight="medium" style={styles.badgeTextGroom}>{groomSidePeople} Groom</Typography>
            </View>
            <View style={[styles.badge, styles.badgeBride, {paddingVertical: 4}]}>
              <Typography variant="caption" weight="medium" style={styles.badgeTextBride}>{brideSidePeople} Bride</Typography>
            </View>
          </View>
        </Card>
        
        <Card style={styles.dashCard}>
          <Typography variant="caption" color={theme.colors.textSecondary}>RSVP</Typography>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4}}>
            <Typography variant="body" weight="semibold" color={theme.colors.success}>{attendingPeople} Yes</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>· {pendingGuests} Pending</Typography>
          </View>
        </Card>
        
        <Pressable onPress={() => handleMainFilter('NeedsRoom')}>
          <Card style={[styles.dashCard, unassignedGuestIds.size > 0 && {borderColor: theme.colors.warning, borderWidth: 1}]}>
            <Typography variant="caption" color={theme.colors.textSecondary}>Needs Room</Typography>
            <Typography variant="screenTitle" weight="semibold" color={unassignedGuestIds.size > 0 ? theme.colors.warning : theme.colors.text}>{unassignedGuestIds.size}</Typography>
          </Card>
        </Pressable>
        
        <Pressable onPress={() => handleMainFilter('NotInvited')}>
          <Card style={[styles.dashCard, (totalGuests - invitedGuestIds.size) > 0 && {borderColor: theme.colors.error, borderWidth: 1}]}>
            <Typography variant="caption" color={theme.colors.textSecondary}>Not Invited</Typography>
            <Typography variant="screenTitle" weight="semibold" color={(totalGuests - invitedGuestIds.size) > 0 ? theme.colors.error : theme.colors.text}>{totalGuests - invitedGuestIds.size}</Typography>
          </Card>
        </Pressable>
      </ScrollView>

      <View style={styles.searchContainer}>
        <TextInput 
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          <FilterPill label="All" isActive={mainFilter === 'All'} onPress={() => handleMainFilter('All')} />
          <FilterPill label="Needs Room" isActive={mainFilter === 'NeedsRoom'} onPress={() => handleMainFilter('NeedsRoom')} />
          <FilterPill label="Has Room" isActive={mainFilter === 'HasRoom'} onPress={() => handleMainFilter('HasRoom')} />
          <FilterPill label="Invited" isActive={mainFilter === 'Invited'} onPress={() => handleMainFilter('Invited')} />
          <FilterPill label="Not Invited" isActive={mainFilter === 'NotInvited'} onPress={() => handleMainFilter('NotInvited')} />
          <FilterPill label="Attending" isActive={mainFilter === 'RSVP_Attending'} onPress={() => handleMainFilter('RSVP_Attending')} />
          <FilterPill label="Groom's Side" isActive={mainFilter === 'Groom'} onPress={() => handleMainFilter('Groom')} />
          <FilterPill label="Bride's Side" isActive={mainFilter === 'Bride'} onPress={() => handleMainFilter('Bride')} />
          
          <View style={[styles.filterDivider, { backgroundColor: theme.colors.border }]} />
          
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

      {filteredGuests.length === 0 ? (
        <View style={styles.emptyContainer}>
          {renderEmptyState()}
        </View>
      ) : (
        <FlatList
          data={filteredGuests}
          keyExtractor={(item) => item.id}
          renderItem={renderGuest}
          contentContainerStyle={[styles.listContent, isSelectMode && { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {isSelectMode && (
        <View style={[styles.bulkActionBar, { backgroundColor: theme.colors.text }]}>
          <Typography variant="body" weight="semibold" style={{color: '#fff', flex: 1}}>
            {selectedGuestIds.size} Selected
          </Typography>
          <Pressable style={styles.bulkBtn} onPress={() => setShowGroupModal(true)} disabled={selectedGuestIds.size === 0}>
            <Typography variant="caption" weight="medium">Move Group</Typography>
          </Pressable>
        </View>
      )}

      {/* Move Group Modal */}
      <Modal visible={showGroupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Typography variant="sectionTitle" style={{marginBottom: 16}}>Select Group</Typography>
            <ScrollView style={{maxHeight: 400}}>
              <Pressable style={[styles.modalRow, { borderBottomColor: theme.colors.borderLight }]} onPress={() => handleBulkMoveToGroup(null)}>
                <Typography variant="body">None (Clear Group)</Typography>
              </Pressable>
              {groups.sort((a,b) => a.sort_order - b.sort_order).map(g => (
                <Pressable key={g.id} style={[styles.modalRow, { borderBottomColor: theme.colors.borderLight }]} onPress={() => handleBulkMoveToGroup(g.id)}>
                  <Typography variant="body">{g.name}</Typography>
                  <Typography variant="caption" color={theme.colors.textSecondary}>{g.side}</Typography>
                </Pressable>
              ))}
            </ScrollView>
            <Button label="Cancel" variant="outline" onPress={() => setShowGroupModal(false)} style={{marginTop: 16}} />
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    marginRight: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dashboardScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  dashCard: {
    padding: spacing.md,
    minWidth: 110,
    justifyContent: 'center',
  },
  filterScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  filterDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  guestCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  guestCardSelected: {
    borderWidth: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  guestNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
    paddingRight: spacing.md,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeGroom: { backgroundColor: '#E0F2FE' },
  badgeTextGroom: { color: '#0369A1' },
  badgeBride: { backgroundColor: '#FCE7F3' },
  badgeTextBride: { color: '#BE185D' },
  badgeGroup: {
    borderWidth: 1,
  },
  badgeTextGroup: {},
  guestDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    marginLeft: 6,
    flex: 1,
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bulkBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  }
});
