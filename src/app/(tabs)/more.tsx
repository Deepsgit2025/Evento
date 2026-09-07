import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography } from '../../components/ui';
import { theme } from '../../theme';
import { HeaderNotificationIcon } from '../../components/ui/HeaderNotificationIcon';
import { useLanguage } from '../../i18n';

interface ModuleTile {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
  bgColor: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const modules: ModuleTile[] = [
    { icon: 'bed', label: t('more.rooms'), route: '/(tabs)/rooms', color: '#7C3AED', bgColor: theme.colors.cardPurple },
    { icon: 'sparkles', label: t('more.assistant'), route: '/(tabs)/assistant', color: '#D4A056', bgColor: theme.colors.cardGold },
    { icon: 'bar-chart', label: t('more.reports'), route: '/(tabs)/reports', color: '#10B981', bgColor: theme.colors.cardGreen },
    { icon: 'mail-open', label: t('more.invitations'), route: '/(tabs)/patrika', color: '#EF4444', bgColor: theme.colors.cardRose },
    { icon: 'wallet', label: t('more.finance'), route: '/(tabs)/finance', color: '#F59E0B', bgColor: theme.colors.cardGold },
    { icon: 'checkbox', label: t('more.checklist'), route: '/(tabs)/tasks', color: '#10B981', bgColor: theme.colors.cardGreen },
    { icon: 'musical-notes', label: t('more.dances'), route: '/(tabs)/dances', color: '#C026D3', bgColor: theme.colors.cardPurple },
    { icon: 'settings', label: t('more.settings'), route: '/(tabs)/settings', color: '#6B6178', bgColor: theme.colors.borderLight },
  ];

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="screenTitle">{t('more.title')}</Typography>
        <HeaderNotificationIcon />
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {modules.map((mod, idx) => (
          <Pressable
            key={idx}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={() => router.push(mod.route as any)}
          >
            <View style={[styles.tileIcon, { backgroundColor: mod.bgColor }]}>
              <Ionicons name={mod.icon} size={28} color={mod.color} />
            </View>
            <Typography variant="body" weight="medium" style={styles.tileLabel}>
              {mod.label}
            </Typography>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, gap: theme.spacing.md,
    paddingBottom: 100,
  },
  tile: {
    width: '47%', backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl, padding: theme.spacing.xl, alignItems: 'center',
    ...theme.shadows.sm, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  tilePressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  tileIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md,
  },
  tileLabel: { textAlign: 'center' },
});
