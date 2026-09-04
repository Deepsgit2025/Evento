import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
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
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  
  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;
  const paddingLeft = edges.includes('left') ? insets.left : 0;
  const paddingRight = edges.includes('right') ? insets.right : 0;

  const { theme } = useTheme();

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
