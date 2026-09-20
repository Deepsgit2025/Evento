import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Typography } from './Typography';
import { useTheme } from '../../theme/ThemeContext';

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

const QUICK_ADD_ITEMS: { label: string; icon: keyof typeof Ionicons.glyphMap; route: string }[] = [
  { label: 'Add Guest', icon: 'person-add', route: '/(tabs)/guests/add' },
  { label: 'Add Event', icon: 'calendar', route: '/(tabs)/events/add' },
  { label: 'Add Task', icon: 'checkbox', route: '/(tabs)/tasks/add' },
  { label: 'Add Expense', icon: 'wallet', route: '/(tabs)/finance/add-expense' },
  { label: 'Add Vendor', icon: 'briefcase', route: '/(tabs)/vendors/add' },
  { label: 'Add Room', icon: 'bed', route: '/(tabs)/rooms/add-room' },
  { label: 'Add Announcement', icon: 'megaphone', route: '/(tabs)/announcements/add' },
];

/** Fast, global entity creation — reachable from the dashboard header and the desktop sidebar. */
export function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const handlePress = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Quick Add">
      <View style={styles.grid}>
        {QUICK_ADD_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => handlePress(item.route)}
            style={({ pressed }) => [styles.tile, { backgroundColor: theme.colors.background }, pressed && { opacity: 0.7 }]}
            accessibilityLabel={item.label}
          >
            <View style={[styles.iconBg, { backgroundColor: theme.colors.cardRose }]}>
              <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
            </View>
            <Typography variant="caption" weight="medium" style={{ textAlign: 'center', marginTop: 8 }}>{item.label}</Typography>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 12 },
  tile: { width: '30%', minWidth: 90, borderRadius: 16, padding: 12, alignItems: 'center' },
  iconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
