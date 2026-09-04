import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Typography } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii, shadows } from '../../../theme';
import { TEMPLATES } from '../../../components/patrika/Templates';

export default function TemplateGalleryScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  // Mock data for previewing templates in the gallery
  const previewData = {
    brideName: 'Aarti',
    groomName: 'Rohan',
    date: 'December 15, 2024',
    venue: 'Taj Palace, Mumbai',
    message: 'Join us to celebrate our new beginning',
    width: 150 // Small width for grid thumbnails
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Typography variant="body" color={theme.colors.textSecondary}>
          Select a design to start customizing your Patrika.
        </Typography>
      </View>
      
      <View style={styles.grid}>
        {TEMPLATES.map((template: any) => {
          const TemplateComponent = template.component;
          return (
            <TouchableOpacity
              key={template.id}
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              onPress={() => router.push(`/(tabs)/patrika/customize?templateId=${template.id}` as any)}
            >
              <View style={styles.previewContainer}>
                <TemplateComponent {...previewData} />
              </View>
              <View style={styles.labelContainer}>
                <Typography variant="body" weight="semibold" align="center">{template.name}</Typography>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 0.66, // 150/225 roughly
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  labelContainer: {
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
