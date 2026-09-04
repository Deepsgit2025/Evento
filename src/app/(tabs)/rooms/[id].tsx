import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, EmptyState } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { RoomService } from '../../../services/room';
import { HotelService } from '../../../services/hotel';
import { RoomAssignmentService } from '../../../services/roomAssignment';
import { Room, Hotel } from '../../../database/types';

export default function RoomDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();

  const [room, setRoom] = useState<Room | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [occupancy, setOccupancy] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoomDetails = async () => {
    if (!id) return;
    try {
      // Manual fetch for room and hotel since we didn't add getRoomById to service earlier
      const r = await db.getFirstAsync<Room>(`SELECT * FROM rooms WHERE id = ?`, [id]);
      if (r) {
        setRoom(r);
        const h = await db.getFirstAsync<Hotel>(`SELECT * FROM hotels WHERE id = ?`, [r.hotel_id]);
        setHotel(h);

        const assignList = await RoomAssignmentService.getAssignmentsByRoom(db, id);
        setAssignments(assignList);

        const occ = await RoomAssignmentService.getRoomOccupancy(db, id);
        setOccupancy(occ);
      }
    } catch (e) {
      console.error("Failed to fetch room details", e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchRoomDetails();
    }, [id, db])
  );

  const handleRemoveGuest = (guestId: string, guestName: string) => {
    Alert.alert(
      "Remove Guest",
      `Are you sure you want to remove ${guestName} from this room?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            await RoomAssignmentService.removeAssignment(db, guestId);
            fetchRoomDetails();
          }
        }
      ]
    );
  };

  if (isLoading || !room) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const isFull = occupancy >= room.capacity;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            <Typography variant="body" color={theme.colors.primary}>Back</Typography>
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <Typography variant="display">Room {room.room_number}</Typography>
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            {hotel?.name}
          </Typography>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Typography variant="caption" color={theme.colors.textSecondary}>Capacity</Typography>
            <Typography variant="cardTitle">{occupancy} / {room.capacity}</Typography>
          </View>
          <View style={styles.statBox}>
            <Typography variant="caption" color={theme.colors.textSecondary}>Type</Typography>
            <Typography variant="cardTitle">{room.room_type || 'Standard'}</Typography>
          </View>
          <View style={styles.statBox}>
            <Typography variant="caption" color={theme.colors.textSecondary}>Status</Typography>
            <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeAvailable]}>
              <Typography variant="caption" weight="medium" style={isFull ? styles.badgeTextFull : styles.badgeTextAvailable}>
                {isFull ? 'Full' : 'Available'}
              </Typography>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Typography variant="sectionTitle">Guests staying here</Typography>
          {!isFull && (
            <Button 
              label="Assign Guest" 
              variant="outline"
              onPress={() => router.push(`/(tabs)/rooms/${room.id}/assign-guest`)}
              style={styles.assignBtn}
            />
          )}
        </View>

        {assignments.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="person-circle-outline" size={48} color={theme.colors.textMuted} />}
            title="Room is empty"
            description="Assign guests to this room."
          />
        ) : (
          assignments.map((assignment) => (
            <Pressable key={assignment.id} onPress={() => router.push(`/(tabs)/guests/${assignment.guest_id}`)}>
              <Card style={styles.guestCard}>
                <View style={styles.guestInfo}>
                  <Typography variant="body" weight="semibold">{assignment.guest_name}</Typography>
                  <Typography variant="caption" color={theme.colors.textSecondary}>
                    {assignment.party_size} {assignment.party_size === 1 ? 'person' : 'people'}
                  </Typography>
                  {assignment.notes && (
                    <Typography variant="caption" color={theme.colors.textMuted} style={styles.notes}>
                      Note: {assignment.notes}
                    </Typography>
                  )}
                </View>
                <Pressable 
                  onPress={() => handleRemoveGuest(assignment.guest_id, assignment.guest_name)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="remove-circle-outline" size={24} color={theme.colors.error} />
                </Pressable>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  titleSection: {
    marginBottom: theme.spacing.xl,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    marginTop: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  assignBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  guestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  guestInfo: {
    flex: 1,
  },
  notes: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  removeBtn: {
    padding: theme.spacing.sm,
  },
});
