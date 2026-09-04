import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Button } from '.';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radii } from '../../theme';
import { ReminderService, Reminder } from '../../services/reminder';
import { Event, Vendor, Payment } from '../../database/types';

interface SmartSuggestionProps {
  type: 'EVENT' | 'PAYMENT';
  entityId: string;
  weddingId: string;
  contextData: any; // Event or Vendor/Payment data
  onAddReminder: (suggestion: Partial<Reminder>) => void;
  onDismiss?: () => void;
}

export const SmartSuggestionBanner = ({ type, entityId, weddingId, contextData, onAddReminder, onDismiss }: SmartSuggestionProps) => {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [suggestion, setSuggestion] = useState<Partial<Reminder> | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    async function evaluateSuggestion() {
      try {
        // 1. Check if a reminder already exists for this entity
        const existing = await db.getFirstAsync<{id: string}>(
          `SELECT id FROM reminders WHERE reference_id = ? AND status = 'SCHEDULED' AND deleted_at IS NULL`,
          [entityId]
        );
        
        if (existing) {
          if (isActive) setIsVisible(false);
          return;
        }

        // 2. Evaluate context based on type
        if (type === 'PAYMENT') {
          // Context is Vendor and Payment list
          const payments = await db.getAllAsync<Payment>(
            `SELECT * FROM payments WHERE vendor_id = ? AND status = 'UNPAID' AND deleted_at IS NULL`,
            [entityId]
          );
          
          if (payments.length > 0) {
            const vendor = contextData as Vendor;
            setMessage(`${vendor.category || 'Vendor'} payment is still pending. Add a reminder?`);
            setSuggestion({
              wedding_id: weddingId,
              type: 'PAYMENT',
              reference_id: entityId,
              title: `Payment pending for ${vendor.name}`,
              notes: `Don't forget to complete the payment for ${vendor.name}.`,
              // Suggestion time: default to tomorrow at 10 AM
              reminder_time: Math.floor(new Date().setHours(24 + 10, 0, 0, 0) / 1000)
            });
            if (isActive) setIsVisible(true);
          }
        } else if (type === 'EVENT') {
          const event = contextData as Event;
          if (!event.start_time) return; // Cannot suggest if no start time
          
          const eventTime = new Date(event.start_time).getTime();
          const now = Date.now();
          
          // If event is in the future and within 7 days
          if (eventTime > now && (eventTime - now) < 7 * 24 * 60 * 60 * 1000) {
            const isTomorrow = new Date(eventTime).getDate() === new Date(now + 86400000).getDate();
            const timeDesc = isTomorrow ? 'tomorrow' : 'approaching';
            setMessage(`Your ${event.name} is ${timeDesc}. Set a reminder?`);
            
            // Suggestion time: 1 day before event
            const reminderTime = Math.floor((eventTime - 86400000) / 1000);
            
            setSuggestion({
              wedding_id: weddingId,
              type: 'EVENT',
              reference_id: entityId,
              title: `Upcoming Event: ${event.name}`,
              notes: `${event.name} starts tomorrow at ${new Date(event.start_time as string).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
              reminder_time: reminderTime > (now / 1000) ? reminderTime : Math.floor(now / 1000) + 3600 // 1 hour from now if < 1 day away
            });
            if (isActive) setIsVisible(true);
          }
        }
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      }
    }

    evaluateSuggestion();
    return () => { isActive = false; };
  }, [db, entityId, type, contextData]);

  if (!isVisible || !suggestion) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primary + '1A', // light primary tint
          borderColor: theme.colors.primary + '33',
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
      </View>
      <Typography variant="caption" weight="medium" style={[styles.message, { color: theme.colors.primary }]}>
        {message}
      </Typography>
      <Button
        variant="primary"
        label="Add"
        onPress={() => onAddReminder(suggestion)}
        style={[styles.button, { paddingVertical: 4 }]}
      />
      {onDismiss && (
        <Pressable onPress={() => { setIsVisible(false); onDismiss(); }} style={styles.dismiss}>
          <Ionicons name="close" size={14} color={theme.colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
  },
  button: {
    paddingHorizontal: spacing.md,
    height: 28,
  },
  dismiss: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  }
});
