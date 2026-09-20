import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from './Typography';
import { useTheme } from '../../theme/ThemeContext';

export type LogoSize = 'sm' | 'md' | 'lg';

const SIZES: Record<LogoSize, { text: number; icon: number; gap: number }> = {
  sm: { text: 18, icon: 14, gap: 6 },
  md: { text: 26, icon: 18, gap: 8 },
  lg: { text: 40, icon: 24, gap: 10 },
};

/**
 * Evento's wordmark: gold ornamental flourishes framing the name in the
 * royal-wine primary, used everywhere the brand appears (auth screens,
 * sidebar header, About). Kept as vector + text since there's no custom
 * artwork file for the mark itself.
 */
export function Logo({ size = 'md' }: { size?: LogoSize }) {
  const { theme } = useTheme();
  const s = SIZES[size];

  return (
    <View style={styles.row}>
      <Ionicons name="sparkles" size={s.icon} color={theme.colors.accent} style={{ marginRight: s.gap }} />
      <Typography
        style={{ fontSize: s.text, letterSpacing: 1.5, color: theme.colors.primary }}
        weight="heavy"
      >
        Evento
      </Typography>
      <Ionicons name="sparkles" size={s.icon} color={theme.colors.accent} style={{ marginLeft: s.gap }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
