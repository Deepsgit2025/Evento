import React from 'react';
import { View, ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

export interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scrollable?: boolean;
  /** Set false for screens that must sit flush against the edges (e.g. full-bleed hero images). */
  breathingRoom?: boolean;
}

/**
 * Safe-area insets alone leave content jammed against the status bar and the
 * tab bar (insets are frequently 0 on Android), so a fixed gap is added on top
 * of them to keep headers and bottom navigation comfortably tappable.
 */
const EDGE_GAP = 12;

export function ScreenContainer({
  children,
  style,
  edges = ['top', 'left', 'right'],
  scrollable = false,
  breathingRoom = true,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const gap = breathingRoom ? EDGE_GAP : 0;

  // The gap only applies to edges the screen opted into, so full-bleed layouts
  // (e.g. the Home hero, which draws to the top itself) stay flush.
  const paddingTop = edges.includes('top') ? insets.top + gap : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom + gap : 0;
  const paddingLeft = edges.includes('left') ? insets.left : 0;
  const paddingRight = edges.includes('right') ? insets.right : 0;

  const { theme } = useTheme();

  if (scrollable) {
    return (
      <ScrollView
        style={[{ backgroundColor: theme.colors.background }, styles.container]}
        contentContainerStyle={[{ paddingTop, paddingBottom, paddingLeft, paddingRight }, style]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        { backgroundColor: theme.colors.background },
        styles.container,
        {
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
