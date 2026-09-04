import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  vertical?: boolean;
}

export function Divider({ style, vertical = false }: DividerProps) {
  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    width: '100%',
    marginVertical: theme.spacing.md,
  },
  vertical: {
    width: 1,
    backgroundColor: theme.colors.borderLight,
    height: '100%',
    marginHorizontal: theme.spacing.md,
  },
});
