import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import { Typography } from './Typography';
import { Button } from './Button';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  style,
}: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Typography variant="sectionTitle">{title}</Typography>
        {subtitle && (
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
            {subtitle}
          </Typography>
        )}
      </View>
      {actionLabel && onActionPress && (
        <Button
          variant="ghost"
          label={actionLabel}
          onPress={onActionPress}
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  actionButton: {
    paddingHorizontal: 0,
    minHeight: 0,
  },
});
