import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer, Typography, Card } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { useLanguage } from '../../../i18n';

export default function WhatsAppSettingsScreen() {
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
            <View style={styles.stepNumber}><Typography variant="caption" weight="bold" color="#fff">1</Typography></View>
            <Typography variant="body" style={styles.stepText}>Create an invitation and select guests.</Typography>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}><Typography variant="caption" weight="bold" color="#fff">2</Typography></View>
            <Typography variant="body" style={styles.stepText}>Tap 'Send' to open WhatsApp with a pre-filled message.</Typography>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}><Typography variant="caption" weight="bold" color="#fff">3</Typography></View>
            <Typography variant="body" style={styles.stepText}>Send the message in WhatsApp and return to Evento.</Typography>
          </View>

          <View style={styles.infoBox}>
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
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
  content: { padding: theme.spacing.lg },
  card: { padding: theme.spacing.xl, alignItems: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#25D36615', justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { marginBottom: theme.spacing.sm, textAlign: 'center' },
  desc: { textAlign: 'center', marginBottom: theme.spacing.xl },
  step: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: theme.spacing.md },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  stepText: { flex: 1 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary + '15', padding: theme.spacing.md, borderRadius: theme.radii.md, marginTop: theme.spacing.lg },
  infoText: { flex: 1, marginLeft: theme.spacing.sm },
});
