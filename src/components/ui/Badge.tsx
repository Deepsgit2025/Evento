import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { Typography } from './Typography';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: '#ECFDF5', text: theme.colors.success };
      case 'warning':
        return { bg: '#FFFBEB', text: theme.colors.warning };
      case 'error':
        return { bg: '#FEF2F2', text: theme.colors.error };
      case 'default':
      default:
        return { bg: theme.colors.borderLight, text: theme.colors.textSecondary };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Typography variant="caption" weight="medium" color={colors.text}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
  },
});
