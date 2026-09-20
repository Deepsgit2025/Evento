import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../ui/Typography';
import { Logo } from '../ui/Logo';
import { QuickAddSheet } from '../ui/QuickAddSheet';
import { useTheme } from '../../theme/ThemeContext';
import { NAV_SECTIONS, NAV_BOTTOM_ITEMS, NavItem } from '../../config/navigation';

const EXPANDED_WIDTH = 248;
const COLLAPSED_WIDTH = 72;

function isActiveRoute(pathname: string, route: string) {
  const normalizedRoute = route.replace('/(tabs)', '') || '/';
  const normalizedPath = pathname.replace('/(tabs)', '') || '/';
  if (normalizedRoute === '/') return normalizedPath === '/';
  return normalizedPath === normalizedRoute || normalizedPath.startsWith(normalizedRoute + '/');
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const renderItem = (item: NavItem) => {
    const active = isActiveRoute(pathname, item.route);
    const hovered = hoveredKey === item.key;

    return (
      <View key={item.key} style={styles.itemWrapper}>
        <Pressable
          onPress={() => router.push(item.route as any)}
          onHoverIn={() => setHoveredKey(item.key)}
          onHoverOut={() => setHoveredKey((k) => (k === item.key ? null : k))}
          style={[
            styles.item,
            collapsed && styles.itemCollapsed,
            active && { backgroundColor: theme.colors.cardRose },
            !active && hovered && { backgroundColor: theme.colors.borderLight },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={20}
            color={active ? theme.colors.primary : theme.colors.textSecondary}
          />
          {!collapsed && (
            <Typography
              variant="body"
              weight={active ? 'semibold' : 'regular'}
              color={active ? theme.colors.primary : theme.colors.text}
              numberOfLines={1}
              style={styles.itemLabel}
            >
              {item.label}
            </Typography>
          )}
          {!collapsed && item.comingSoon && (
            <View style={[styles.soonBadge, { backgroundColor: theme.colors.cardGold }]}>
              <Typography variant="caption" weight="bold" color={theme.colors.accentDark} style={styles.soonText}>SOON</Typography>
            </View>
          )}
        </Pressable>

        {/* Collapsed-mode tooltip */}
        {collapsed && hovered && (
          <View style={[styles.tooltip, { backgroundColor: theme.colors.text }]}>
            <Typography variant="caption" color={theme.colors.background} numberOfLines={1}>
              {item.label}{item.comingSoon ? ' (soon)' : ''}
            </Typography>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { width, backgroundColor: theme.colors.surface, borderRightColor: theme.colors.borderLight }]}>
      <View style={styles.header}>
        {!collapsed && <Logo size="sm" />}
        <Pressable onPress={() => setCollapsed((c) => !c)} style={styles.collapseButton} accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.quickRow, collapsed && styles.quickRowCollapsed]}>
        <Pressable
          onPress={() => router.push('/(tabs)/search' as any)}
          style={[styles.quickBtn, { backgroundColor: theme.colors.borderLight }]}
          accessibilityLabel="Search"
        >
          <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
          {!collapsed && <Typography variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>Search</Typography>}
        </Pressable>
        <Pressable
          onPress={() => setShowQuickAdd(true)}
          style={[styles.quickBtn, { backgroundColor: theme.colors.primary }]}
          accessibilityLabel="Quick add"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          {!collapsed && <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 8 }}>Quick Add</Typography>}
        </Pressable>
      </View>

      <QuickAddSheet visible={showQuickAdd} onClose={() => setShowQuickAdd(false)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {NAV_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            {!collapsed && (
              <Typography variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.sectionTitle}>
                {section.title.toUpperCase()}
              </Typography>
            )}
            {section.items.map(renderItem)}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomSection, { borderTopColor: theme.colors.borderLight }]}>
        {NAV_BOTTOM_ITEMS.map(renderItem)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 32,
  },
  collapseButton: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  quickRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  quickRowCollapsed: { paddingHorizontal: 8 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },
  section: { marginBottom: 16, paddingHorizontal: 8 },
  sectionTitle: { paddingHorizontal: 12, marginBottom: 6, letterSpacing: 0.5 },
  itemWrapper: { position: 'relative' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, gap: 12,
  },
  itemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  itemLabel: { flex: 1 },
  soonBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  soonText: { fontSize: 9 },
  tooltip: {
    position: 'absolute', left: 68, top: 8, zIndex: 20,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  bottomSection: { paddingHorizontal: 8, paddingTop: 12, borderTopWidth: 1 },
});
