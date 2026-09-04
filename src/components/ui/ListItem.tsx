import React from 'react';
import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../../theme';
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
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && onPress && styles.pressed,
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
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    backgroundColor: theme.colors.background,
  },
  leftContainer: {
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    marginLeft: theme.spacing.md,
  },
});
