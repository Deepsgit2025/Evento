import React from 'react';
import { Pressable, PressableProps, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../../theme';

export interface IconButtonProps extends PressableProps {
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  variant = 'ghost',
  style,
  disabled,
  ...props
}: IconButtonProps) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const getBackgroundColor = (pressed: boolean) => {
    if (isGhost) return pressed ? theme.colors.borderLight : 'transparent';
    if (disabled) return theme.colors.disabled;
    if (isPrimary) return pressed ? theme.colors.primaryPressed : theme.colors.primary;
    return pressed ? theme.colors.border : theme.colors.surface;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(pressed),
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
