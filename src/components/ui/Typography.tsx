import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { theme } from '../../theme';

export type TypographyVariant =
  | 'hero'
  | 'display'
  | 'screenTitle'
  | 'sectionTitle'
  | 'cardTitle'
  | 'body'
  | 'bodySecondary'
  | 'caption'
  | 'button';

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Typography({
  variant = 'body',
  color,
  weight,
  align = 'left',
  style,
  children,
  ...props
}: TypographyProps) {
  const { theme } = useTheme();
  
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        { color: color || theme.colors.text, textAlign: align },
        weight && { fontWeight: theme.typography.weights[weight] },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: theme.typography.fontFamily,
  },
  hero: {
    fontSize: theme.typography.sizes.hero,
    fontWeight: theme.typography.weights.heavy,
    lineHeight: theme.typography.sizes.hero * 1.15,
    letterSpacing: -0.5,
  },
  display: {
    fontSize: theme.typography.sizes.display,
    fontWeight: theme.typography.weights.bold,
    lineHeight: theme.typography.sizes.display * 1.2,
    letterSpacing: -0.3,
  },
  screenTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    lineHeight: theme.typography.sizes.xxl * 1.25,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: theme.typography.sizes.xl * 1.3,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: theme.typography.sizes.lg * 1.35,
  },
  body: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.regular,
    lineHeight: theme.typography.sizes.md * 1.55,
  },
  bodySecondary: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.regular,
    lineHeight: theme.typography.sizes.sm * 1.5,
  },
  caption: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.regular,
    lineHeight: theme.typography.sizes.xs * 1.4,
  },
  button: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.2,
  },
});

