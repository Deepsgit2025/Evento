import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, EmptyState } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { PhotoService } from '../../services/photo';
import { WeddingPhoto } from '../../database/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_SIZE = (Math.min(SCREEN_WIDTH, 480) - 24 * 2 - 8 * 2) / 3;

export default function PhotoCollectionScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<WeddingPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setPhotos(await PhotoService.getPhotos(db, wedding.id));
    } catch (e) {
      console.error('Failed to load photos', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickAndAdd = async () => {
    if (!weddingId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to add wedding photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    setIsPicking(true);
    try {
      for (const asset of result.assets) {
        await PhotoService.addPhoto(db, weddingId, asset.uri);
      }
      await load();
    } finally {
      setIsPicking(false);
    }
  };

  const confirmDelete = (photo: WeddingPhoto) => {
    Alert.alert('Remove photo?', 'This only removes it from Evento, not your device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await PhotoService.deletePhoto(db, photo.id); await load(); } },
    ]);
  };

  if (isLoading && photos.length === 0) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Typography variant="screenTitle">Photo Collection</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>{photos.length} photo{photos.length !== 1 ? 's' : ''} saved on this device</Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={pickAndAdd} disabled={isPicking}>
          {isPicking ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="add" size={20} color={theme.colors.primary} />}
        </Pressable>
      </View>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="images-outline" size={48} color={theme.colors.textMuted} />}
          title="No photos yet"
          description="Add photos from this device, organized as memories over time. A shareable guest-upload link needs cloud storage this app doesn't have yet."
          actionLabel="Add Photos"
          onAction={pickAndAdd}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
          {photos.map((photo) => (
            <Pressable key={photo.id} onLongPress={() => confirmDelete(photo)} style={styles.tile}>
              <Image source={{ uri: photo.uri }} style={styles.tileImage} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 8, paddingTop: 8 },
  tile: { width: TILE_SIZE, height: TILE_SIZE, borderRadius: 12, overflow: 'hidden' },
  tileImage: { width: '100%', height: '100%' },
});
