import React from 'react';
import { Pressable, PressableProps, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  /** Convenience shorthand: renders an Ionicons glyph before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  isLoading = false,
  icon,
  leftIcon,
  rightIcon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  
  const isDisabled = disabled || isLoading;

  const getBackgroundColor = (pressed: boolean) => {
    if (isGhost || isOutline) return pressed ? theme.colors.borderLight : 'transparent';
    if (isDisabled) return theme.colors.disabled;
    if (isPrimary) return pressed ? theme.colors.primaryPressed : theme.colors.primary;
    return pressed ? theme.colors.border : theme.colors.surface;
  };

  const getBorderColor = () => {
    if (isOutline) return isDisabled ? theme.colors.disabled : theme.colors.primary;
    return 'transparent';
  };

  const getTextColor = () => {
    if (isDisabled && !isPrimary) return theme.colors.disabledText;
    if (isDisabled && isPrimary) return theme.colors.textMuted;
    if (isPrimary) return '#FFFFFF';
    if (isOutline) return theme.colors.primary;
    return theme.colors.text;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: isOutline ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        isPrimary && !isDisabled && theme.shadows.md,
        style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {leftIcon ?? (icon ? <Ionicons name={icon} size={20} color={getTextColor()} /> : null)}
          <Typography variant="button" color={getTextColor()}>
            {label}
          </Typography>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    minHeight: 56,
  },
});

