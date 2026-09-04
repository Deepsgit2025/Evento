import React from 'react';
import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import { Typography } from './Typography';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title,
  subtitle,
  leftElement,
  rightElement,
  onPress,
  style,
}: ListItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.surface },
        pressed && onPress && { backgroundColor: theme.colors.background },
        style,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      {leftElement && <View style={styles.leftContainer}>{leftElement}</View>}
      <View style={styles.textContainer}>
        <Typography variant="body" weight="medium">{title}</Typography>
        {subtitle && (
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>
            {subtitle}
          </Typography>
        )}
      </View>
      {rightElement && <View style={styles.rightContainer}>{rightElement}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  leftContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    marginLeft: spacing.md,
  },
});
