import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Typography } from '../../../components/ui';
import { theme } from '../../../theme';
import { TEMPLATES } from '../../../components/patrika/Templates';

export default function TemplateGalleryScreen() {
  const router = useRouter();

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
              style={styles.card}
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
    padding: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
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
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
