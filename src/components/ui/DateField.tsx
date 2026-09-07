import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

interface DateFieldProps {
  label?: string;
  /** ISO date ("YYYY-MM-DD") for mode="date", or "HH:MM" for mode="time". Empty means unset. */
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'time';
  placeholder?: string;
  minimumDate?: Date;
}

/** Parses "YYYY-MM-DD" as a local-time date, avoiding the UTC-midnight
 *  interpretation `new Date(isoString)` uses (which shifts the displayed day
 *  by one in negative-UTC-offset timezones). */
function parseIsoDateLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

function toDate(value: string, mode: 'date' | 'time'): Date {
  if (mode === 'time') {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return d;
  }
  return (value && parseIsoDateLocal(value)) || new Date();
}

function formatValue(date: Date, mode: 'date' | 'time'): string {
  if (mode === 'time') {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string, mode: 'date' | 'time'): string | null {
  if (!value) return null;
  if (mode === 'time') return value;
  const date = parseIsoDateLocal(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Native calendar/clock picker field. Stores dates as ISO "YYYY-MM-DD" and
 * times as "HH:MM" so downstream countdown/sort logic can parse them
 * reliably, instead of free-text like "24 Oct 2026".
 */
export function DateField({ label, value, onChange, mode = 'date', placeholder, minimumDate }: DateFieldProps) {
  const { theme } = useTheme();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setIsPickerOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(formatValue(selected, mode));
  };

  const displayValue = formatDisplay(value, mode);

  return (
    <View style={styles.container}>
      {label && (
        <Typography variant="caption" weight="medium" color={theme.colors.textSecondary} style={styles.label}>
          {label}
        </Typography>
      )}
      <Pressable
        style={[styles.field, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => setIsPickerOpen(true)}
      >
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={20}
          color={theme.colors.textSecondary}
          style={styles.icon}
        />
        <Typography variant="body" color={displayValue ? theme.colors.text : theme.colors.textMuted}>
          {displayValue || placeholder || (mode === 'time' ? 'Select time' : 'Select date')}
        </Typography>
      </Pressable>

      {isPickerOpen && (
        <DateTimePicker
          value={toDate(value, mode)}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          {...(Platform.OS === 'ios' ? { themeVariant: theme.colors.isDark ? 'dark' : 'light' } : {})}
        />
      )}

      {Platform.OS === 'ios' && isPickerOpen && (
        <Pressable style={styles.iosDoneButton} onPress={() => setIsPickerOpen(false)}>
          <Typography variant="button" color={theme.colors.primary}>Done</Typography>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 10,
  },
  iosDoneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
