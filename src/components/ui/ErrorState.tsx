import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import { Typography } from './Typography';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  style,
}: ErrorStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Typography variant="sectionTitle" align="center" style={styles.title}>
        {title}
      </Typography>
      <Typography variant="body" align="center" color={theme.colors.textSecondary} style={styles.message}>
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outline" label="Try Again" onPress={onRetry} style={styles.retryButton} />
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
  title: {
    marginBottom: spacing.sm,
  },
  message: {
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
  retryButton: {
    minWidth: 120,
  },
});
