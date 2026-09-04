import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, EmptyState } from '../../../../components/ui';
import { theme } from '../../../../theme';
import { RoomAssignmentService } from '../../../../services/roomAssignment';
import { RoomService } from '../../../../services/room';
import { GuestService } from '../../../../services/guest';
import { HotelService } from '../../../../services/hotel';
import { Guest, Room, Hotel } from '../../../../database/types';
import { Ionicons } from '@expo/vector-icons';

type RoomWithOccupancy = Room & {
  hotel_name: string;
  occupancy: number;
};

export default function AssignRoomModal() {
  const { id } = useLocalSearchParams<{ id: string }>(); // guest id
  const router = useRouter();
  const db = useSQLiteContext();

  const [guest, setGuest] = useState<Guest | null>(null);
  const [rooms, setRooms] = useState<RoomWithOccupancy[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const g = await GuestService.getGuestById(db, id);
        if (!g) return;
        setGuest(g);

        const currentAssignment = await RoomAssignmentService.getGuestAssignment(db, id);
        if (currentAssignment) {
          setSelectedRoomId(currentAssignment.room_id);
        }

        const allRooms = await RoomService.getRoomsByWedding(db, g.wedding_id);
        const hotels = await HotelService.getHotels(db, g.wedding_id);

        const roomsData: RoomWithOccupancy[] = [];
        for (const room of allRooms) {
          const occ = await RoomAssignmentService.getRoomOccupancy(db, room.id);
          const hotel = hotels.find(h => h.id === room.hotel_id);
          roomsData.push({
            ...room,
            occupancy: occ,
            hotel_name: hotel?.name || 'Unknown Property'
          });
        }
        setRooms(roomsData);
      } catch (e) {
        console.error("Failed to fetch assign room data", e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, db]);

  const handleAssign = async () => {
    if (!id || !guest || !selectedRoomId) return;
    
    // Check if unassigning
    if (selectedRoomId === 'UNASSIGN') {
      setIsSaving(true);
      try {
        await RoomAssignmentService.removeAssignment(db, guest.id);
        router.back();
      } catch(e: any) {
        setError(e.message || "Failed to remove assignment.");
        setIsSaving(false);
      }
      return;
    }

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    // We do a fast check here (though service also validates).
    // If the guest is already in this room, they aren't adding to occupancy, so subtract their size from current if moving.
    // Actually the service `assignGuest` handles this perfectly. Let's just pass it through.

    setIsSaving(true);
    setError(null);

    try {
      await RoomAssignmentService.assignGuest(db, guest.id, selectedRoomId);
      router.back();
    } catch (e: any) {
      setError(e.message || "Failed to assign room.");
      setIsSaving(false);
    }
  };

  if (isLoading || !guest) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const renderRoom = ({ item }: { item: RoomWithOccupancy }) => {
    const isSelected = selectedRoomId === item.id;
    // Check if adding this guest would exceed capacity (assuming guest is NOT already in this room)
    const wouldExceed = !isSelected && (item.occupancy + guest.party_size > item.capacity);
    const isFull = item.occupancy >= item.capacity;

    return (
      <Pressable 
        onPress={() => !wouldExceed && setSelectedRoomId(item.id)}
        disabled={wouldExceed}
      >
        <Card style={[
          styles.roomCard, 
          isSelected && styles.roomCardSelected,
          wouldExceed && styles.roomCardDisabled
        ]}>
          <View style={styles.roomInfo}>
            <View>
              <Typography variant="body" weight="semibold" color={wouldExceed ? theme.colors.textMuted : theme.colors.text}>
                Room {item.room_number}
              </Typography>
              <Typography variant="caption" color={theme.colors.textSecondary}>
                {item.hotel_name} • {item.room_type || 'Standard'}
              </Typography>
            </View>
            <View style={styles.occupancyBox}>
               <Typography variant="caption" weight="medium" color={wouldExceed ? theme.colors.error : theme.colors.primary}>
                 {item.occupancy} / {item.capacity}
               </Typography>
            </View>
          </View>
          {isSelected && (
            <View style={styles.checkIcon}>
               <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="sectionTitle">Assign Room</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
          {guest.full_name} • Party of {guest.party_size}
        </Typography>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Typography variant="caption" color={theme.colors.error}>{error}</Typography>
        </View>
      )}

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          rooms.length > 0 ? (
            <Pressable onPress={() => setSelectedRoomId('UNASSIGN')} style={styles.unassignOption}>
               <Typography variant="body" weight="medium" color={selectedRoomId === 'UNASSIGN' ? theme.colors.primary : theme.colors.textSecondary}>
                  [ Remove room assignment ]
               </Typography>
               {selectedRoomId === 'UNASSIGN' && (
                 <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
               )}
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon={<Ionicons name="bed-outline" size={48} color={theme.colors.textMuted} />}
              title="No rooms available"
              description="You must add hotels and rooms in the Accommodations tab first."
            />
          </View>
        }
      />

      <View style={styles.footer}>
        <Button 
          label="Cancel" 
          variant="outline" 
          onPress={() => router.back()} 
          style={styles.footerButton} 
          disabled={isSaving}
        />
        <Button 
          label={isSaving ? "Saving..." : "Save"} 
          variant="primary" 
          onPress={handleAssign} 
          style={styles.footerButton} 
          disabled={isSaving || !selectedRoomId}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  errorContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    margin: theme.spacing.lg,
    borderRadius: theme.radii.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xxl,
    justifyContent: 'center',
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  unassignOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roomCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0FDF4',
  },
  roomCardDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.borderLight,
  },
  roomInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occupancyBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.background,
  },
  checkIcon: {
    marginLeft: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: theme.spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
