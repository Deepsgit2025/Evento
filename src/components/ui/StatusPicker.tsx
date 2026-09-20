import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

export interface StatusOption {
  value: string;
  label: string;
  color: string;
  bg: string;
}

interface StatusPickerProps {
  options: StatusOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** A horizontal row of selectable status pills, used to update a live status field (event/vendor/baraat). */
export function StatusPicker({ options, value, onChange, disabled }: StatusPickerProps) {
  const { theme } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={[
              styles.pill,
              { backgroundColor: active ? opt.bg : theme.colors.borderLight, borderColor: active ? opt.color : 'transparent' },
              disabled && { opacity: 0.5 },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: opt.color }]} />
            <Typography variant="caption" weight={active ? 'bold' : 'medium'} color={active ? opt.color : theme.colors.textSecondary}>
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
