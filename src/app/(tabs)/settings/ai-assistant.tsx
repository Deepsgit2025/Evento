import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card } from '../../../components/ui';
import { theme } from '../../../theme';

export default function AIAssistantSettingsScreen() {
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">AI Assistant</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={32} color={theme.colors.primary} />
        </View>
        <Typography variant="sectionTitle" style={styles.title}>Built-in, on-device</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.description}>
          Evento's AI Assistant answers questions about your guests, events, budget, and tasks by
          reading your wedding data directly on this device. There's nothing to set up — it works
          fully offline, with no external API, no API key, and no data ever leaving your phone.
        </Typography>

        <Card style={styles.exampleCard}>
          <Typography variant="body" weight="semibold" style={{ marginBottom: theme.spacing.sm }}>Try asking things like:</Typography>
          {[
            'Is Rohan Mehta coming?',
            'Which room is the Sharma family in?',
            'How much have we spent so far?',
            'What tasks are overdue?',
          ].map((example) => (
            <View key={example} style={styles.exampleRow}>
              <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textMuted} />
              <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>
                "{example}"
              </Typography>
            </View>
          ))}
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  exampleCard: {
    width: '100%',
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
});
