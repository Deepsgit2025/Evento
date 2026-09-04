import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, Card } from '../../../components/ui';
import { theme } from '../../../theme';
import { useLanguage, Language } from '../../../i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  const renderOption = (id: Language, title: string, subtitle: string) => (
    <Pressable 
      style={({pressed}) => [styles.option, pressed && styles.pressed]}
      onPress={() => handleSelectLanguage(id)}
    >
      <View style={styles.textContainer}>
        <Typography variant="body" weight="medium">{title}</Typography>
        <Typography variant="caption" color={theme.colors.textSecondary}>{subtitle}</Typography>
      </View>
      <Ionicons 
        name={language === id ? "checkmark.circle.fill" : "circle"} 
        size={24} 
        color={language === id ? theme.colors.primary : theme.colors.border} 
      />
    </Pressable>
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">{t('settings.language')}</Typography>
      </View>
      
      <View style={styles.content}>
        <Card style={styles.card}>
          {renderOption('en', 'English', 'Application standard language')}
          <View style={styles.divider} />
          {renderOption('hi', 'हिंदी (Hindi)', 'ऐप की मानक भाषा')}
        </Card>
      </View>
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
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  textContainer: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 16,
  },
});
