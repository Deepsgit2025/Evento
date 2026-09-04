import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, TextInput, Button, Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing } from '../../../theme';
import { AIService } from '../../../services/ai';

export default function AIAssistantSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const loadKey = async () => {
      try {
        const key = await AIService.getApiKey();
        if (key && isActive) {
          setApiKey(key);
        }
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    loadKey();
    return () => { isActive = false; };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (apiKey.trim() === '') {
        // Clear key
        await AIService.setApiKey('');
      } else {
        await AIService.setApiKey(apiKey.trim());
      }
      Alert.alert('Success', 'AI Assistant configuration saved', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <ScreenContainer><View /></ScreenContainer>;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">AI Assistant</Typography>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
          <Ionicons name="sparkles" size={32} color={theme.colors.primary} />
        </View>
        <Typography variant="sectionTitle" style={styles.title}>Gemini Configuration</Typography>
        <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={styles.description}>
          Evento uses Google's Gemini AI to power the intelligent wedding assistant. To use the AI Assistant, please provide your own Gemini API key.
        </Typography>

        <Card>
          <TextInput
            label="API Key"
            placeholder="AIzaSy..."
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
          />
          <Typography variant="caption" color={theme.colors.textMuted} style={styles.hint}>
            Your API key is stored securely on this device and is only used to communicate with the Gemini API directly.
          </Typography>
        </Card>

        <Button 
          label="Save Configuration" 
          onPress={handleSave} 
          isLoading={isSaving} 
          style={styles.saveBtn}
        />
      </ScrollView>
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  hint: {
    marginTop: spacing.sm,
  },
  saveBtn: {
    width: '100%',
    marginTop: spacing.xl,
  }
});
