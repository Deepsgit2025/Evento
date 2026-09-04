import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Image } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

export interface AvatarProps {
  url?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ url, fallback, size = 'md', style }: AvatarProps) {
  const { theme } = useTheme();

  const getDimensions = () => {
    switch (size) {
      case 'sm': return 32;
      case 'lg': return 64;
      case 'md':
      default: return 48;
    }
  };

  const dim = getDimensions();
  const containerStyle = { width: dim, height: dim, borderRadius: dim / 2 };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.borderLight }, containerStyle, style]}>
      {url ? (
        <Image source={{ uri: url }} style={[styles.image, containerStyle]} />
      ) : (
        <Typography variant="body" weight="medium" color={theme.colors.textSecondary}>
          {fallback.substring(0, 2).toUpperCase()}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
});
