import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';

export default function AppearanceScreen() {
  const router = useRouter();
  const { mode, setMode, theme } = useTheme();

  const handleSetMode = (newMode: 'system' | 'light' | 'dark') => {
    setMode(newMode);
  };

  const renderOption = (id: 'system' | 'light' | 'dark', title: string, icon: any) => (
    <Pressable 
      style={({pressed}) => [styles.option, { backgroundColor: pressed ? theme.colors.surfaceElevated : theme.colors.surface }]}
      onPress={() => handleSetMode(id)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color={theme.colors.text} />
      </View>
      <Typography variant="body" weight="medium" style={styles.optionText}>{title}</Typography>
      <Ionicons name={mode === id ? "checkmark-circle" : "ellipse-outline"} size={24} color={mode === id ? theme.colors.primary : theme.colors.border} />
    </Pressable>
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Appearance</Typography>
      </View>
      
      <View style={styles.content}>
        <Card style={styles.card}>
          {renderOption('light', 'Light Mode', 'sunny-outline')}
        </Card>

        <Typography variant="caption" color={theme.colors.textSecondary} style={styles.note}>
          Evento is designed as a light-mode app, so it stays light regardless of your phone's system theme.
        </Typography>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginLeft: 50,
  },
  note: {
    marginTop: spacing.lg,
    textAlign: 'center',
  }
});
