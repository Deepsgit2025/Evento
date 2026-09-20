import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { HeaderNotificationIcon } from '../../components/ui/HeaderNotificationIcon';
import { useLanguage } from '../../i18n';
import { NAV_SECTIONS, NAV_BOTTOM_ITEMS, NavItem } from '../../config/navigation';

// Routes already reachable from the main bottom tab bar — no need to repeat
// them here so the full nav (sidebar on desktop, this screen on mobile)
// stays consistent without duplicating entry points.
const HIDDEN_ON_MORE = new Set(['dashboard', 'events', 'guests', 'vendors']);

export default function MoreScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !HIDDEN_ON_MORE.has(item.key)),
  })).filter((section) => section.items.length > 0);

  const renderTile = (item: NavItem) => (
    <Pressable
      key={item.key}
      style={({ pressed }) => [styles.tile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }, pressed && styles.tilePressed]}
      onPress={() => router.push(item.route as any)}
    >
      <View style={[styles.tileIcon, { backgroundColor: theme.colors.cardRose }]}>
        <Ionicons name={item.icon} size={26} color={theme.colors.primary} />
      </View>
      <Typography variant="body" weight="medium" style={styles.tileLabel} numberOfLines={2}>
        {item.label}
      </Typography>
      {item.comingSoon && (
        <View style={[styles.soonBadge, { backgroundColor: theme.colors.cardGold }]}>
          <Typography variant="caption" weight="bold" color={theme.colors.accentDark} style={{ fontSize: 9 }}>SOON</Typography>
        </View>
      )}
    </Pressable>
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.header}>
        <Typography variant="screenTitle">{t('more.title')}</Typography>
        <HeaderNotificationIcon />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Typography>
            <View style={styles.grid}>
              {section.items.map(renderTile)}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.sectionTitle}>ACCOUNT</Typography>
          <View style={styles.grid}>
            {NAV_BOTTOM_ITEMS.map(renderTile)}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
  section: { marginBottom: 20 },
  sectionTitle: { marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', borderRadius: 20, padding: 18, alignItems: 'center', borderWidth: 1, position: 'relative',
  },
  tilePressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  tileIcon: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  tileLabel: { textAlign: 'center' },
  soonBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
});
