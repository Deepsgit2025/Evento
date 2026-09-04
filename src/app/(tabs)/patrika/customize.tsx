import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { theme } from '../../../theme';
import { TEMPLATES, PatrikaProps } from '../../../components/patrika/Templates';
import { PatrikaService, PatrikaDTO, PatrikaCustomization } from '../../../services/patrika';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CustomizeScreen() {
  const { templateId, editId } = useLocalSearchParams<{ templateId: string, editId?: string }>();
  const router = useRouter();
  const db = useSQLiteContext();

  const template = TEMPLATES.find((t: any) => t.id === templateId);
  
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [fontScale, setFontScale] = useState(1.0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weddingId, setWeddingId] = useState('');

  useEffect(() => {
    async function loadInitialData() {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (!session) return;
        const wedding = await getUserWedding(db, session.id);
        if (!wedding) return;
        
        setWeddingId(wedding.id);
        
        // Defaults
        setBrideName(wedding.bride_name);
        setGroomName(wedding.groom_name);
        setDate(wedding.date || 'To be decided');
        setVenue(wedding.venue || 'To be decided');
        setMessage('We invite you to share our joy');
        setTitle(`${template?.name} Design`);

        if (editId) {
          const existing = await PatrikaService.getInvitationById(db, editId);
          if (existing) {
            setTitle(existing.title);
            try {
              const cust: PatrikaCustomization = JSON.parse(existing.customization_data);
              if (cust.custom_date) setDate(cust.custom_date);
              if (cust.custom_venue) setVenue(cust.custom_venue);
              if (cust.message) setMessage(cust.message);
              if (cust.fontScale) setFontScale(cust.fontScale);
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [db, editId]);

  if (!template || isLoading) return null;

  const TemplateComponent = template.component;
  const previewWidth = SCREEN_WIDTH - 40; // full width minus padding

  const previewProps: PatrikaProps = {
    brideName,
    groomName,
    date,
    venue,
    message,
    width: previewWidth,
    fontScale
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please provide a title for this invitation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dto: PatrikaDTO = {
        template_id: template.id,
        title: title.trim(),
        customization_data: {
          custom_date: date,
          custom_venue: venue,
          message: message,
          fontScale: fontScale
        }
      };

      if (editId) {
        await PatrikaService.updateInvitation(db, editId, dto);
        router.replace(`/(tabs)/patrika/${editId}` as any);
      } else {
        const newInv = await PatrikaService.createInvitation(db, weddingId, dto);
        router.replace(`/(tabs)/patrika/${newInv.id}` as any);
      }
    } catch (e: any) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.previewSection}>
          <View style={[styles.previewWrapper, { width: previewWidth, height: previewWidth * 1.5 }]}>
            <TemplateComponent {...previewProps} />
          </View>
        </View>

        <View style={styles.formSection}>
          <Typography variant="sectionTitle" style={styles.formTitle}>Customize Fields</Typography>
          
          <TextInput
            label="Internal Title (For your reference)"
            value={title}
            onChangeText={setTitle}
          />
          
          <TextInput
            label="Date text"
            value={date}
            onChangeText={setDate}
          />

          <TextInput
            label="Venue text"
            value={venue}
            onChangeText={setVenue}
          />

          <TextInput
            label="Custom Message"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={2}
          />

          <View style={{ marginTop: 20 }}>
            <Typography variant="caption" weight="medium" color={theme.colors.textSecondary}>Font Scale</Typography>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Button label="A-" variant="outline" onPress={() => setFontScale(prev => Math.max(0.5, prev - 0.1))} style={{ flex: 1, marginRight: 10 }} />
              <Typography variant="body" style={{ width: 40, textAlign: 'center' }}>{fontScale.toFixed(1)}x</Typography>
              <Button label="A+" variant="outline" onPress={() => setFontScale(prev => Math.min(2.0, prev + 0.1))} style={{ flex: 1, marginLeft: 10 }} />
            </View>
          </View>

        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Save & Preview" onPress={handleSave} isLoading={isSubmitting} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  previewSection: {
    backgroundColor: '#000',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrapper: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...theme.shadows.md,
  },
  formSection: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  formTitle: {
    marginBottom: theme.spacing.lg,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    backgroundColor: theme.colors.background,
  }
});
