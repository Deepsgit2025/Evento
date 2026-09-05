import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography } from '../../../components/ui';
import { theme } from '../../../theme';
import { TEMPLATES } from '../../../components/patrika/Templates';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { formatIsoDateFriendly } from '../../../utils/date';

export default function TemplateGalleryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  // Preview data mirrors the couple's actual wedding details so templates
  // show what the invitation will really look like, not a stranger's names.
  const [previewData, setPreviewData] = useState({
    brideName: 'Bride Name',
    groomName: 'Groom Name',
    date: 'Wedding Date',
    venue: 'Venue',
    message: 'Join us to celebrate our new beginning',
    width: 150, // Small width for grid thumbnails
  });

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding || !isActive) return;
        setPreviewData(prev => ({
          ...prev,
          brideName: wedding.bride_name || prev.brideName,
          groomName: wedding.groom_name || prev.groomName,
          date: formatIsoDateFriendly(wedding.date) || prev.date,
          venue: wedding.venue || prev.venue,
        }));
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { isActive = false; };
  }, [db]);

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
