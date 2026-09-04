import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  vertical?: boolean;
}

export function Divider({ style, vertical = false }: DividerProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: theme.colors.borderLight },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
    marginVertical: spacing.md,
  },
  vertical: {
    width: 1,
    height: '100%',
    marginHorizontal: spacing.md,
  },
});
