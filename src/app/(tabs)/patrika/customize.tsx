import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, Typography, TextInput, Button } from '../../../components/ui';
import { theme } from '../../../theme';
import { TEMPLATES, PatrikaProps } from '../../../components/patrika/Templates';
import { PatrikaService, PatrikaDTO, PatrikaCustomization } from '../../../services/patrika';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { formatIsoDateFriendly } from '../../../utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACCENT_COLORS = ['#D4AF37', '#E11D48', '#7A1C29', '#0B132B', '#8BA390', '#B8860B', '#1C1C1C', '#F79256'];

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
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [accentColor, setAccentColor] = useState<string>(ACCENT_COLORS[0]);
  const supportsPhoto = templateId === 't7' || templateId === 't10';

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
        setDate(formatIsoDateFriendly(wedding.date) || 'To be decided');
        setVenue(wedding.venue || 'To be decided');
        setMessage('दोनों परिवारों के स्नेह आशीर्वाद सहित, हम आपको हमारे विवाह में सादर आमंत्रित करते हैं।');
        setTitle(`${template?.name} Design`);
        if (wedding.cover_photo_uri) setPhotoUri(wedding.cover_photo_uri);

        if (editId) {
          const existing = await PatrikaService.getInvitationById(db, editId);
          if (existing) {
            setTitle(existing.title);
            try {
              const cust: PatrikaCustomization = JSON.parse(existing.customization_data);
              if (cust.custom_bride_name) setBrideName(cust.custom_bride_name);
              if (cust.custom_groom_name) setGroomName(cust.custom_groom_name);
              if (cust.custom_date) setDate(cust.custom_date);
              if (cust.custom_venue) setVenue(cust.custom_venue);
              if (cust.message) setMessage(cust.message);
              if (cust.fontScale) setFontScale(cust.fontScale);
              if (cust.cover_photo_uri) setPhotoUri(cust.cover_photo_uri);
              if (cust.accent_color) setAccentColor(cust.accent_color);
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
    fontScale,
    photoUri: supportsPhoto ? photoUri : undefined,
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to add a cover photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
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
          custom_bride_name: brideName,
          custom_groom_name: groomName,
          custom_date: date,
          custom_venue: venue,
          message: message,
          fontScale: fontScale,
          cover_photo_uri: photoUri,
          accent_color: accentColor,
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
          <View style={[styles.previewWrapper, { width: previewWidth, height: previewWidth * 1.5, borderColor: accentColor }]}>
            <TemplateComponent {...previewProps} />
          </View>
        </View>

        <View style={styles.formSection}>
          <Typography variant="sectionTitle" style={styles.formTitle}>Customize Fields</Typography>

          {supportsPhoto && (
            <View style={{ marginBottom: 20 }}>
              <Typography variant="caption" weight="medium" color={theme.colors.textSecondary}>Cover Photo</Typography>
              <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="image-outline" size={28} color={theme.colors.textMuted} />
                    <Typography variant="caption" color={theme.colors.textMuted}>Tap to choose a photo</Typography>
                  </View>
                )}
                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginBottom: 20 }}>
            <Typography variant="caption" weight="medium" color={theme.colors.textSecondary}>Accent Color</Typography>
            <View style={styles.colorRow}>
              {ACCENT_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setAccentColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    accentColor === color && styles.colorSwatchSelected,
                  ]}
                >
                  {accentColor === color && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            label="Internal Title (For your reference)"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            label="Bride Name"
            placeholder="e.g. Priya"
            value={brideName}
            onChangeText={setBrideName}
          />

          <TextInput
            label="Groom Name"
            placeholder="e.g. Rahul"
            value={groomName}
            onChangeText={setGroomName}
          />

          <TextInput
            label="Date"
            placeholder="e.g. 24 October 2026"
            value={date}
            onChangeText={setDate}
          />

          <TextInput
            label="Venue / Destination"
            placeholder="e.g. Taj Palace, Mumbai"
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
    borderWidth: 4,
    borderRadius: theme.radii.md,
    ...theme.shadows.md,
  },
  photoPicker: {
    marginTop: 10,
    width: 120,
    height: 160,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderLight,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoEditBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: theme.colors.text,
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
