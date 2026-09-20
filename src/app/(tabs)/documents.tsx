import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, EmptyState, Card, TextInput, Button } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { DocumentService } from '../../services/document';
import { WeddingDocument, DOCUMENT_CATEGORIES } from '../../database/types';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Contract: 'document-text', Permit: 'shield-checkmark', Invoice: 'receipt',
  'ID Proof': 'card', 'Booking Confirmation': 'calendar', Other: 'document',
};

interface PendingFile { uri: string; name: string; mimeType?: string | null; }

export default function DocumentsScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [docs, setDocs] = useState<WeddingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (!wedding) return;
      setWeddingId(wedding.id);
      setDocs(await DocumentService.getDocuments(db, wedding.id));
    } catch (e) {
      console.error('Failed to load documents', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPending({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    setTitle(asset.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSave = async () => {
    if (!weddingId || !pending) return;
    setIsSaving(true);
    try {
      await DocumentService.addDocument(db, weddingId, {
        title: title.trim() || pending.name, category, file_uri: pending.uri, file_name: pending.name, mime_type: pending.mimeType || undefined,
      });
      setPending(null); setTitle('');
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const openDoc = (doc: WeddingDocument) => {
    Linking.openURL(doc.file_uri).catch(() => Alert.alert('Cannot open', 'This device has no app that can open this file type.'));
  };

  const remove = async (doc: WeddingDocument) => {
    await DocumentService.deleteDocument(db, doc.id);
    await load();
  };

  if (isLoading && docs.length === 0) {
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
          <Typography variant="screenTitle">Documents</Typography>
          <Typography variant="bodySecondary" color={theme.colors.textSecondary}>{docs.length} file{docs.length !== 1 ? 's' : ''} saved</Typography>
        </View>
        <Pressable style={[styles.addButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]} onPress={handlePick}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {pending && (
          <Card style={styles.card}>
            <View style={styles.pendingRow}>
              <Ionicons name="document-attach" size={20} color={theme.colors.primary} />
              <Typography variant="bodySecondary" style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>{pending.name}</Typography>
            </View>
            <TextInput label="Title" value={title} onChangeText={setTitle} containerStyle={{ marginTop: theme.spacing.md }} />
            <Typography variant="caption" color={theme.colors.textSecondary} style={styles.label}>Category</Typography>
            <View style={styles.chipRow}>
              {DOCUMENT_CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.chip, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? theme.colors.cardRose : theme.colors.surface }]}>
                    <Typography variant="caption" weight={selected ? 'semibold' : 'medium'} color={selected ? theme.colors.primary : theme.colors.textSecondary}>{cat}</Typography>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.actionsRow}>
              <Button label="Cancel" variant="ghost" onPress={() => setPending(null)} style={{ flex: 1 }} />
              <Button label={isSaving ? 'Saving...' : 'Save'} onPress={handleSave} isLoading={isSaving} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {docs.length === 0 && !pending ? (
          <EmptyState
            icon={<Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />}
            title="No documents yet"
            description="Keep contracts, permits, and important paperwork all in one place."
            actionLabel="Add Document"
            onAction={handlePick}
          />
        ) : (
          docs.map((doc) => (
            <Pressable key={doc.id} onPress={() => openDoc(doc)}>
              <Card style={[styles.card, styles.docRow]}>
                <View style={[styles.iconBg, { backgroundColor: theme.colors.cardGold }]}>
                  <Ionicons name={CATEGORY_ICONS[doc.category] || 'document'} size={20} color={theme.colors.accentDark} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Typography variant="body" weight="semibold" numberOfLines={1}>{doc.title}</Typography>
                  <Typography variant="caption" color={theme.colors.textSecondary}>{doc.category}</Typography>
                </View>
                <Pressable onPress={() => remove(doc)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                </Pressable>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { paddingHorizontal: 24 },
  card: { padding: 16, marginBottom: 12 },
  pendingRow: { flexDirection: 'row', alignItems: 'center' },
  label: { marginTop: 8, marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  docRow: { flexDirection: 'row', alignItems: 'center' },
  iconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
