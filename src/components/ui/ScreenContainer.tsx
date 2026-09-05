import React from 'react';
import { View, ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

export interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scrollable?: boolean;
}

export function ScreenContainer({
  children,
  style,
  edges = ['top', 'left', 'right'],
  scrollable = false,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;
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
