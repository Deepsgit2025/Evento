import React from 'react';
import { View, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import { Typography } from './Typography';

export interface LoadingStateProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ message, style }: LoadingStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && (
        <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.message}>
          {message}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
  },
});
