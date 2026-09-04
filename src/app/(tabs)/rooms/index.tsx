import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable, Alert, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer, Typography, EmptyState, Card } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { HotelService } from '../../../services/hotel';
import { RoomService } from '../../../services/room';
import { RoomAssignmentService } from '../../../services/roomAssignment';
import { Hotel, Room } from '../../../database/types';

type FilterType = 'All' | 'Available' | 'Full' | 'Empty';

type RoomWithOccupancy = Room & { occupancy: number };

export default function RoomsDashboard() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { theme } = useTheme();

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<RoomWithOccupancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('All');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (session) {
        const wedding = await getUserWedding(db, session.id);
        if (wedding) {
          const [fetchedHotels, fetchedRooms] = await Promise.all([
            HotelService.getHotels(db, wedding.id),
            RoomService.getRoomsByWedding(db, wedding.id)
          ]);
          
          const roomsWithOccupancy: RoomWithOccupancy[] = [];
          for (const room of fetchedRooms) {
            const occ = await RoomAssignmentService.getRoomOccupancy(db, room.id);
            roomsWithOccupancy.push({ ...room, occupancy: occ });
          }
          
          setHotels(fetchedHotels);
          setRooms(roomsWithOccupancy);
        }
      }
    } catch (error) {
      console.error("Failed to fetch rooms data", error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [db])
  );

  const handleDeleteHotel = (hotel: Hotel) => {
    Alert.alert(
      "Delete Property?",
      `Are you sure you want to delete ${hotel.name}? This will permanently delete all rooms inside it.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await HotelService.deleteHotel(db, hotel.id);
            fetchData();
          }
        }
      ]
    );
  };

  const getFilteredRooms = () => {
    if (filter === 'All') return rooms;
    if (filter === 'Available') return rooms.filter(r => r.occupancy < r.capacity);
    if (filter === 'Full') return rooms.filter(r => r.occupancy >= r.capacity);
    if (filter === 'Empty') return rooms.filter(r => r.occupancy === 0);
    return rooms;
  };

  const filteredRooms = getFilteredRooms();
  // Only show hotels that have rooms matching the filter, OR all hotels if filter is 'All'
  const visibleHotels = filter === 'All' 
    ? hotels 
    : hotels.filter(h => filteredRooms.some(r => r.hotel_id === h.id));

  if (isLoading && hotels.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon={<Ionicons name="bed-outline" size={48} color={theme.colors.textMuted} />}
        title="No rooms added yet"
        description="Add a hotel and its rooms to start assigning guests."
        actionLabel="Add Hotel"
        onAction={() => router.push('/(tabs)/rooms/add-hotel')}
      />
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {(['All', 'Available', 'Full', 'Empty'] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              filter === f && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Typography
              variant="caption"
              weight="medium"
              color={filter === f ? theme.colors.surface : theme.colors.textSecondary}
            >
              {f}
            </Typography>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderHotelGroup = ({ item: hotel }: { item: Hotel }) => {
    const hotelRooms = filteredRooms.filter(r => r.hotel_id === hotel.id);
    
    // If we're filtering, and this hotel has no matching rooms, skip it (already handled in visibleHotels, but double check)
    if (filter !== 'All' && hotelRooms.length === 0) return null;
    
    return (
      <View style={styles.hotelGroup}>
        <View style={styles.hotelHeader}>
          <View style={styles.hotelTitleRow}>
            <Ionicons name="business-outline" size={20} color={theme.colors.primary} />
            <Typography variant="sectionTitle" style={styles.hotelName}>{hotel.name}</Typography>
          </View>
          <View style={styles.hotelActions}>
            <Pressable onPress={() => router.push({ pathname: '/(tabs)/rooms/add-room', params: { hotel_id: hotel.id } })}>
               <Typography variant="bodySecondary" weight="medium" color={theme.colors.primary}>+ Add Room</Typography>
            </Pressable>
            <Pressable onPress={() => handleDeleteHotel(hotel)} style={styles.deleteIcon}>
               <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
            </Pressable>
          </View>
        </View>

        {hotelRooms.length === 0 ? (
          <Card style={[styles.emptyRoomsCard, { backgroundColor: theme.colors.background }]}>
            <Typography variant="bodySecondary" color={theme.colors.textMuted}>No rooms in this property.</Typography>
          </Card>
        ) : (
          hotelRooms.map(room => {
            const isFull = room.occupancy >= room.capacity;
            return (
              <Pressable key={room.id} onPress={() => router.push(`/(tabs)/rooms/${room.id}`)}>
                <Card style={styles.roomCard}>
                  <View style={styles.roomHeader}>
                    <View>
                      <Typography variant="body" weight="semibold">Room {room.room_number}</Typography>
                      <Typography variant="caption" color={theme.colors.textSecondary}>
                        {room.room_type ? `${room.room_type} · ` : ''}Capacity: {room.capacity}
                      </Typography>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                  </View>
                  <View style={[styles.roomFooter, { borderTopColor: theme.colors.borderLight }]}>
                    <Typography variant="caption" weight="medium" color={theme.colors.textSecondary}>
                      Occupancy: {room.occupancy} / {room.capacity} people
                    </Typography>
                    <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeAvailable]}>
                      <Typography variant="caption" weight="medium" style={isFull ? styles.badgeTextFull : styles.badgeTextAvailable}>
                        {isFull ? 'Full' : 'Available'}
                      </Typography>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Typography variant="sectionTitle">Accommodation</Typography>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed && styles.pressedState,
          ]}
          onPress={() => router.push('/(tabs)/rooms/add-hotel')}
        >
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Typography variant="body" weight="medium" color={theme.colors.primary} style={styles.addButtonText}>
            Add Hotel
          </Typography>
        </Pressable>
      </View>

      {hotels.length > 0 && renderFilters()}

      {hotels.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={visibleHotels}
          keyExtractor={(item) => item.id}
          renderItem={renderHotelGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyFilterContainer}>
              <Typography variant="body" color={theme.colors.textMuted}>No rooms match this filter.</Typography>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  addButtonText: {
    marginLeft: 4,
  },
  pressedState: {
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hotelGroup: {
    marginBottom: spacing.xl,
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  hotelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hotelName: {
    marginLeft: 8,
    flexShrink: 1,
  },
  hotelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deleteIcon: {
    padding: 4,
  },
  emptyRoomsCard: {
    padding: spacing.md,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  roomCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  deleteIconRoom: {
    padding: 4,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeAvailable: {
    backgroundColor: '#DCFCE7', // Light green
  },
  badgeTextAvailable: {
    color: '#166534', // Dark green
  },
  badgeFull: {
    backgroundColor: '#FEE2E2', // Light red
  },
  badgeTextFull: {
    color: '#991B1B', // Dark red
  },
  filterWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterScroll: {
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  emptyFilterContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  }
});
