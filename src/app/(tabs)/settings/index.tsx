import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';
import { useLanguage } from '../../../i18n';

type IoniconsName = keyof typeof Ionicons.glyphMap;

export default function SettingsIndexScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const renderSettingItem = (title: string, subtitle: string, icon: IoniconsName, route: any) => (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: pressed ? theme.colors.surfaceElevated : theme.colors.surface },
      ]}
      onPress={() => router.push(route)}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Typography variant="body" weight="medium">{title}</Typography>
        <Typography variant="caption" color={theme.colors.textSecondary}>{subtitle}</Typography>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
    </Pressable>
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="screenTitle">{t('settings.title')}</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Typography variant="sectionTitle" style={styles.sectionTitle}>{t('settings.wedding')}</Typography>
        <Card style={styles.card}>
          {renderSettingItem(t('settings.weddingProfile'), t('settings.weddingProfileDesc'), 'heart', '/(tabs)/settings/profile')}
        </Card>

        <Typography variant="sectionTitle" style={styles.sectionTitle}>{t('settings.general')}</Typography>
        <Card style={styles.card}>
          {renderSettingItem(t('settings.appearance'), t('settings.appearanceDesc'), 'color-palette', '/(tabs)/settings/appearance')}
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          {renderSettingItem(t('settings.language'), t('settings.languageDesc'), 'language', '/(tabs)/settings/language')}
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          {renderSettingItem(t('settings.ai'), t('settings.aiDesc'), 'sparkles-outline', '/(tabs)/settings/ai-assistant')}
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          {renderSettingItem(t('settings.notifications'), t('settings.notificationsDesc'), 'notifications-outline', '/(tabs)/settings/notifications')}
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          {renderSettingItem(t('settings.whatsapp'), t('settings.whatsappDesc'), 'logo-whatsapp', '/(tabs)/settings/whatsapp')}
        </Card>

        <Typography variant="sectionTitle" style={styles.sectionTitle}>{t('settings.dataSync')}</Typography>
        <Card style={styles.card}>
          {renderSettingItem(t('settings.syncStatus'), t('settings.syncDesc'), 'cloud-outline', '/(tabs)/settings/sync')}
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          {renderSettingItem(t('settings.backup'), t('settings.backupDesc'), 'download-outline', '/(tabs)/settings/backup')}
        </Card>
        
        <Typography variant="sectionTitle" style={styles.sectionTitle}>{t('settings.system')}</Typography>
        <Card style={styles.card}>
          {renderSettingItem(t('settings.privacy'), t('settings.privacyDesc'), 'shield-checkmark-outline', '/(tabs)/settings/privacy')}
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          {renderSettingItem(t('settings.about'), t('settings.aboutDesc'), 'information-circle-outline', '/(tabs)/settings/about')}
        </Card>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  content: { padding: spacing.lg, paddingBottom: 100 },
  sectionTitle: { marginBottom: spacing.md, marginTop: spacing.lg },
  card: { padding: 0, overflow: 'hidden' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  textContainer: { flex: 1 },
  divider: { height: 1, marginLeft: 72 },
});
