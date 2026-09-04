import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { Typography } from './Typography';

export interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'pending' | 'error';
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusIndicator({ status, label, style }: StatusIndicatorProps) {
  const getDotColor = () => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'error': return theme.colors.error;
      case 'pending': return theme.colors.warning;
      case 'inactive':
      default: return theme.colors.disabledText;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dot, { backgroundColor: getDotColor() }]} />
      {label && (
        <Typography variant="caption" color={theme.colors.textSecondary}>
          {label}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
