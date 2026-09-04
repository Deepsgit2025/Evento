import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Linking, Platform, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, Card, ListItem, Button, Badge, SmartSuggestionBanner } from '../../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { VendorService } from '../../../../services/vendor';
import { VendorEventService } from '../../../../services/vendorEvent';
import { PaymentService, PaymentSummary } from '../../../../services/payment';
import { ReminderService, Reminder } from '../../../../services/reminder';
import { Vendor, Event, Payment } from '../../../../database/types';

export default function VendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [unassignedEvents, setUnassignedEvents] = useState<Event[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({ agreed: 0, paid: 0, remaining: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchVendorData = useCallback(async () => {
    try {
      const v = await VendorService.getVendorById(db, id);
      if (!v) return;
      setVendor(v);

      const [assigned, summary, payHistory, unassigned] = await Promise.all([
        VendorEventService.getEventsForVendor(db, id),
        PaymentService.getVendorPaymentSummary(db, id),
        PaymentService.getPaymentsForVendor(db, id),
        VendorEventService.getUnassignedEventsForVendor(db, v.wedding_id, id)
      ]);

      setEvents(assigned);
      setPaymentSummary(summary);
      setPayments(payHistory);
      setUnassignedEvents(unassigned);
    } catch (error) {
      console.error('Failed to load vendor details', error instanceof Error ? error.message : String(error));
      Alert.alert('Error', 'Could not load vendor details.');
    } finally {
      setIsLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      fetchVendorData();
    }, [fetchVendorData])
  );

  const handleDelete = () => {
    const confirmDelete = async () => {
      try {
        await VendorService.deleteVendor(db, id);
        router.back();
      } catch (error) {
        Alert.alert('Error', 'Could not delete vendor.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this vendor? This action cannot be undone.")) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Delete Vendor",
        "Are you sure you want to delete this vendor? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmDelete }
        ]
      );
    }
  };

  const handleUnassignEvent = async (eventId: string) => {
    try {
      await VendorEventService.unassignVendorFromEvent(db, id, eventId);
      fetchVendorData();
    } catch (e) {
      Alert.alert('Error', 'Could not unassign event.');
    }
  };

  const handleAssignEvent = async (eventId: string) => {
    try {
      await VendorEventService.assignVendorToEvent(db, id, eventId);
      fetchVendorData();
    } catch (e) {
      Alert.alert('Error', 'Could not assign event.');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const confirmAction = async () => {
      try {
        await PaymentService.deletePayment(db, paymentId);
        fetchVendorData();
      } catch (error) {
        Alert.alert('Error', 'Could not delete payment.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm("Delete this payment record?")) confirmAction();
    } else {
      Alert.alert("Delete Payment", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmAction }
      ]);
    }
  };

  const handlePhonePress = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Could not open dialer.');
    });
  };

  const handleEmailPress = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}`).catch(() => {
      Alert.alert('Error', 'Could not open email app.');
    });
  };

  const handleAddReminder = async (suggestion: Partial<Reminder>) => {
    try {
      await ReminderService.createReminder(db, suggestion as Omit<Reminder, 'id' | 'status' | 'notification_id' | 'created_at' | 'updated_at'>);
      Alert.alert('Success', 'Reminder scheduled.');
    } catch (e) {
      Alert.alert('Error', 'Could not set reminder.');
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!vendor) {
    return (
      <ScreenContainer style={styles.center}>
        <Typography variant="body" color={theme.colors.textSecondary}>Vendor not found.</Typography>
        <Button label="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.iconContainer}>
              <Ionicons name="briefcase" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionIcon} onPress={() => router.push(`/(tabs)/vendors/${vendor.id}/edit` as any)}>
                <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
          
          <Typography variant="screenTitle" style={styles.title}>{vendor.name}</Typography>
          <Badge label={vendor.category} variant="default" />
        </Card>

        {paymentSummary.remaining > 0 && (
          <SmartSuggestionBanner 
            type="PAYMENT" 
            entityId={vendor.id} 
            weddingId={vendor.wedding_id} 
            contextData={vendor} 
            onAddReminder={handleAddReminder} 
          />
        )}

        {/* Payments Summary Section */}
        <View style={styles.section}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Payments</Typography>
          <Card>
            <View style={styles.paymentSummaryGrid}>
              <View style={styles.summaryCol}>
                <Typography variant="caption" color={theme.colors.textSecondary}>Agreed</Typography>
                <Typography variant="body" weight="bold">₹{paymentSummary.agreed.toLocaleString()}</Typography>
              </View>
              <View style={styles.summaryCol}>
                <Typography variant="caption" color={theme.colors.textSecondary}>Paid</Typography>
                <Typography variant="body" weight="bold" color={theme.colors.success}>₹{paymentSummary.paid.toLocaleString()}</Typography>
              </View>
              <View style={styles.summaryCol}>
                <Typography variant="caption" color={theme.colors.textSecondary}>Remaining</Typography>
                {paymentSummary.remaining < 0 ? (
                  <Badge label={`OVERPAID ₹${Math.abs(paymentSummary.remaining).toLocaleString()}`} variant="warning" />
                ) : (
                  <Typography variant="body" weight="bold">₹{paymentSummary.remaining.toLocaleString()}</Typography>
                )}
              </View>
            </View>
          </Card>

          {/* Payment History List */}
          {payments.length > 0 && (
            <Card style={styles.listCard}>
              {payments.map(payment => (
                <ListItem 
                  key={payment.id}
                  title={`₹${payment.amount.toLocaleString()} - ${payment.payment_method}`}
                  subtitle={`${payment.payment_date} ${payment.notes ? `· ${payment.notes}` : ''}`}
                  leftElement={<Ionicons name="cash-outline" size={20} color={theme.colors.success} />}
                  rightElement={
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.smallAction} onPress={() => router.push(`/(tabs)/vendors/${vendor.id}/edit-payment?paymentId=${payment.id}` as any)}>
                        <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.smallAction} onPress={() => handleDeletePayment(payment.id)}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  }
                />
              ))}
            </Card>
          )}

          <Button 
            variant="outline" 
            label="Record Payment" 
            onPress={() => router.push(`/(tabs)/vendors/${vendor.id}/add-payment` as any)}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>

        {/* Event Assignments */}
        <View style={styles.section}>
          <Typography variant="sectionTitle" style={styles.sectionTitle}>Event Assignments</Typography>
          {events.length > 0 ? (
            <Card style={styles.listCard}>
              {events.map(event => (
                <ListItem 
                  key={event.id}
                  title={event.name}
                  subtitle={event.date ? `${event.date} at ${event.start_time}` : 'No date set'}
                  leftElement={<Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />}
                  rightElement={
                    <TouchableOpacity onPress={() => handleUnassignEvent(event.id)}>
                      <Ionicons name="remove-circle-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  }
                />
              ))}
            </Card>
          ) : (
            <Typography variant="body" color={theme.colors.textSecondary} style={{ marginBottom: theme.spacing.md }}>
              No events assigned yet.
            </Typography>
          )}

          {unassignedEvents.length > 0 && (
            <Card style={[styles.listCard, { marginTop: theme.spacing.sm }]}>
              <View style={{ padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated }}>
                <Typography variant="body" weight="medium">Assign to upcoming events</Typography>
              </View>
              {unassignedEvents.map(event => (
                <ListItem 
                  key={event.id}
                  title={event.name}
                  subtitle={event.date || ''}
                  rightElement={
                    <TouchableOpacity onPress={() => handleAssignEvent(event.id)}>
                      <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  }
                />
              ))}
            </Card>
          )}
        </View>

        {/* Contact Info Card */}
        {(vendor.contact_person || vendor.phone || vendor.alternate_phone || vendor.email || vendor.address) && (
          <View style={styles.section}>
            <Typography variant="sectionTitle" style={styles.sectionTitle}>Contact Info</Typography>
            <Card style={styles.listCard}>
              {vendor.contact_person && (
                <ListItem 
                  title={vendor.contact_person}
                  subtitle="Contact Person"
                  leftElement={<Ionicons name="person" size={20} color={theme.colors.textSecondary} />}
                />
              )}
              {vendor.phone && (
                <ListItem 
                  title={vendor.phone}
                  subtitle="Phone"
                  leftElement={<Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />}
                  onPress={() => handlePhonePress(vendor.phone!)}
                />
              )}
              {vendor.alternate_phone && (
                <ListItem 
                  title={vendor.alternate_phone}
                  subtitle="Alt Phone"
                  leftElement={<Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />}
                  onPress={() => handlePhonePress(vendor.alternate_phone!)}
                />
              )}
              {vendor.email && (
                <ListItem 
                  title={vendor.email}
                  subtitle="Email"
                  leftElement={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
                  onPress={() => handleEmailPress(vendor.email!)}
                />
              )}
              {vendor.address && (
                <ListItem 
                  title={vendor.address}
                  subtitle="Address"
                  leftElement={<Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />}
                />
              )}
            </Card>
          </View>
        )}

        {/* Notes Section */}
        {vendor.notes && (
          <View style={styles.section}>
            <Typography variant="sectionTitle" style={styles.sectionTitle}>Notes</Typography>
            <Card>
              <Typography variant="body" color={theme.colors.textSecondary}>
                {vendor.notes}
              </Typography>
            </Card>
          </View>
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
  headerCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: -theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginLeft: 'auto',
  },
  actionIcon: {
    padding: theme.spacing.xs,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  paymentSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  smallAction: {
    padding: theme.spacing.xs,
  },
});
