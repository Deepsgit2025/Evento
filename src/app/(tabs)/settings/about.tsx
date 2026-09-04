import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { ScreenContainer, Typography, Card } from '../../../components/ui';
import { theme } from '../../../theme';

export default function AboutScreen() {
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">About</Typography>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          {/* Use a placeholder local app icon or a styled text */}
          <View style={styles.iconPlaceholder}>
            <Typography variant="display" color={theme.colors.surface}>E</Typography>
          </View>
          <Typography variant="screenTitle" style={styles.appName}>Evento</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>Version 1.0.0 (Build 42)</Typography>
        </View>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textSecondary}>Developer</Typography>
            <Typography variant="body" weight="medium">Evento Team</Typography>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textSecondary}>Framework</Typography>
            <Typography variant="body" weight="medium">React Native (Expo)</Typography>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Typography variant="body" color={theme.colors.textSecondary}>Database</Typography>
            <Typography variant="body" weight="medium">SQLite Local-First</Typography>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.xxl,
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  appName: {
    marginBottom: 4,
  },
  card: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  }
});
