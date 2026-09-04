import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import { Typography } from './Typography';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <Typography variant="sectionTitle" weight="semibold" style={styles.title}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body" color={theme.colors.textSecondary} style={styles.description}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.7,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  button: {
    marginTop: spacing.xl,
    minWidth: 160,
  },
});
