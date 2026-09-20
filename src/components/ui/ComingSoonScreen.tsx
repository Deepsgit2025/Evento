import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from './ScreenContainer';
import { Typography } from './Typography';
import { useTheme } from '../../theme/ThemeContext';

interface ComingSoonScreenProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * Honest placeholder for modules in the roadmap that aren't wired to real
 * data yet, so the sidebar/drawer can list every planned section without
 * ever pretending a feature works when it doesn't.
 */
export function ComingSoonScreen({ title, description, icon }: ComingSoonScreenProps) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={[styles.iconBg, { backgroundColor: theme.colors.cardGold }]}>
          <Ionicons name={icon} size={36} color={theme.colors.accent} />
        </View>
        <Typography variant="sectionTitle" weight="heavy" style={{ marginTop: 20, textAlign: 'center' }}>{title}</Typography>
        <View style={[styles.badge, { backgroundColor: theme.colors.cardGold }]}>
          <Typography variant="caption" weight="bold" color={theme.colors.accentDark}>COMING SOON</Typography>
        </View>
        <Typography variant="body" color={theme.colors.textSecondary} style={styles.description}>{description}</Typography>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 16 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconBg: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  badge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  description: { textAlign: 'center', marginTop: 16, lineHeight: 22 },
});
