import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}

export function Card({ children, style, elevated = false }: CardProps) {
  const { theme } = useTheme();
  
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: elevated ? theme.colors.surfaceElevated : theme.colors.surface },
        elevated ? styles.elevated : styles.flat,
        { borderColor: elevated ? 'transparent' : theme.colors.borderLight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  flat: {
    borderWidth: 1,
  },
  elevated: {
  },
});

