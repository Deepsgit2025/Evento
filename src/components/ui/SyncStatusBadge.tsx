import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { radii } from '../../theme';
import { Typography } from './Typography';
import { useSync } from '../../context/SyncContext';

export function SyncStatusBadge() {
  const { status, isOnline } = useSync();
  const { theme } = useTheme();

  const getStatusInfo = () => {
    if (!isOnline) return { icon: 'cloud-offline-outline' as const, text: 'Offline', color: theme.colors.textMuted };

    switch (status) {
      case 'synced': return { icon: 'cloud-done-outline' as const, text: 'Backed up', color: theme.colors.success };
      case 'syncing': return { icon: 'sync-outline' as const, text: 'Syncing...', color: theme.colors.primary };
      case 'error': return { icon: 'cloud-offline-outline' as const, text: 'Sync failed', color: theme.colors.error };
      case 'pending': return { icon: 'cloud-upload-outline' as const, text: 'Changes pending', color: theme.colors.warning };
      case 'not_connected': return { icon: 'cloud-outline' as const, text: 'Not connected', color: theme.colors.textMuted };
      default: return { icon: 'cloud-outline' as const, text: 'Ready', color: theme.colors.textMuted };
    }
  };

  const info = getStatusInfo();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Ionicons name={info.icon} size={16} color={info.color} />
      <Typography variant="caption" weight="medium" color={info.color} style={styles.text}>
        {info.text}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radii.full,
  },
  text: { marginLeft: 2 },
});
