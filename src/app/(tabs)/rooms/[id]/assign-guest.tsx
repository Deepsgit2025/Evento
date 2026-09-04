import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, Button, EmptyState } from '../../../../components/ui';
import { theme } from '../../../../theme';
import { RoomAssignmentService } from '../../../../services/roomAssignment';
import { RoomService } from '../../../../services/room';
import { AuthService } from '../../../../services/auth';
import { getUserWedding } from '../../../../services/wedding';
import { Guest, Room } from '../../../../database/types';
import { Ionicons } from '@expo/vector-icons';

export default function AssignGuestModal() {
  const { id } = useLocalSearchParams<{ id: string }>(); // room id
  const router = useRouter();
  const db = useSQLiteContext();

  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [occupancy, setOccupancy] = useState(0);
  
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const r = await db.getFirstAsync<Room>(`SELECT * FROM rooms WHERE id = ?`, [id]);
        if (r) setRoom(r);

        const occ = await RoomAssignmentService.getRoomOccupancy(db, id);
        setOccupancy(occ);

        const session = await AuthService.getCurrentSession(db);
        if (session) {
          const wedding = await getUserWedding(db, session.id);
          if (wedding) {
            const guests = await RoomAssignmentService.getUnassignedGuests(db, wedding.id);
            setUnassignedGuests(guests);
          }
        }
      } catch (e) {
        console.error("Failed to fetch assign guest data", e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, db]);

  const handleAssign = async () => {
    if (!id || !selectedGuestId || !room) return;
    const selectedGuest = unassignedGuests.find(g => g.id === selectedGuestId);
    if (!selectedGuest) return;

    if (occupancy + selectedGuest.party_size > room.capacity) {
      setError(`Cannot assign ${selectedGuest.full_name}. Room is full or would exceed capacity.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await RoomAssignmentService.assignGuest(db, selectedGuestId, id);
      router.back();
    } catch (e: any) {
      setError(e.message || "Failed to assign guest.");
      setIsSaving(false);
    }
  };

  if (isLoading || !room) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const renderGuest = ({ item }: { item: Guest }) => {
    const isSelected = selectedGuestId === item.id;
    const isTooBig = occupancy + item.party_size > room.capacity;
    
    return (
      <Pressable 
        onPress={() => !isTooBig && setSelectedGuestId(isSelected ? null : item.id)}
        disabled={isTooBig}
      >
        <Card style={[
          styles.guestCard, 
          isSelected && styles.guestCardSelected,
          isTooBig && styles.guestCardDisabled
        ]}>
          <View style={styles.guestInfo}>
            <Typography variant="body" weight="semibold" color={isTooBig ? theme.colors.textMuted : theme.colors.text}>
              {item.full_name}
            </Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>
              Party size: {item.party_size}
            </Typography>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
          )}
          {isTooBig && (
            <Typography variant="caption" color={theme.colors.error}>Exceeds limit</Typography>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="sectionTitle">Assign Guest</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
          Room {room.room_number} • Capacity remaining: {room.capacity - occupancy}
        </Typography>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Typography variant="caption" color={theme.colors.error}>{error}</Typography>
        </View>
      )}

      {unassignedGuests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="person-remove-outline" size={48} color={theme.colors.textMuted} />}
            title="No unassigned guests"
            description="All your guests have been assigned to rooms."
          />
        </View>
      ) : (
        <FlatList
          data={unassignedGuests}
          keyExtractor={(item) => item.id}
          renderItem={renderGuest}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.footer}>
        <Button 
          label="Cancel" 
          variant="outline" 
          onPress={() => router.back()} 
          style={styles.footerButton} 
          disabled={isSaving}
        />
        <Button 
          label={isSaving ? "Assigning..." : "Assign"} 
          variant="primary" 
          onPress={handleAssign} 
          style={styles.footerButton} 
          disabled={isSaving || !selectedGuestId}
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
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  guestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  guestCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0FDF4',
  },
  guestCardDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.borderLight,
  },
  guestInfo: {
    flex: 1,
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
