import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer, Typography, Card } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radii } from '../../../theme';
import { useLanguage } from '../../../i18n';

export default function WhatsAppSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <ScreenContainer edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="screenTitle">{t('settings.whatsapp')}</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="logo-whatsapp" size={48} color="#25D366" />
          </View>
          
          <Typography variant="sectionTitle" style={styles.title}>
            How Invitations Work
          </Typography>
          
          <Typography variant="body" color={theme.colors.textSecondary} style={styles.desc}>
            Evento uses WhatsApp installed on your phone to send invitations.
          </Typography>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}><Typography variant="caption" weight="bold" color="#fff">1</Typography></View>
            <Typography variant="body" style={styles.stepText}>Create an invitation and select guests.</Typography>
          </View>
          
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}><Typography variant="caption" weight="bold" color="#fff">2</Typography></View>
            <Typography variant="body" style={styles.stepText}>Tap 'Send' to open WhatsApp with a pre-filled message.</Typography>
          </View>
          
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}><Typography variant="caption" weight="bold" color="#fff">3</Typography></View>
            <Typography variant="body" style={styles.stepText}>Send the message in WhatsApp and return to Evento.</Typography>
          </View>

          <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <Typography variant="caption" color={theme.colors.primary} style={styles.infoText}>
              No API keys or business accounts are required! It works with your personal WhatsApp.
            </Typography>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  content: { padding: spacing.lg },
  card: { padding: spacing.xl, alignItems: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#25D36615', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  title: { marginBottom: spacing.sm, textAlign: 'center' },
  desc: { textAlign: 'center', marginBottom: spacing.xl },
  step: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: spacing.md },
  stepNumber: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  stepText: { flex: 1 },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radii.md, marginTop: spacing.lg },
  infoText: { flex: 1, marginLeft: spacing.sm },
});
