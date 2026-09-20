import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Typography, SearchInput, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { AuthService } from '../../services/auth';
import { getUserWedding } from '../../services/wedding';
import { GlobalSearchService, SearchResult } from '../../services/globalSearch';

const ENTITY_ICONS: Record<SearchResult['entityType'], keyof typeof Ionicons.glyphMap> = {
  Guest: 'people', Event: 'calendar', Vendor: 'briefcase', Room: 'bed',
  Expense: 'wallet', Task: 'checkbox', Invitation: 'mail-open', Announcement: 'megaphone',
};

export default function GlobalSearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const session = await AuthService.getCurrentSession(db);
      if (!session) return;
      const wedding = await getUserWedding(db, session.id);
      if (wedding) setWeddingId(wedding.id);
    })();
  }, [db]));

  const runSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!weddingId) return;
    if (text.trim().length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      setResults(await GlobalSearchService.search(db, weddingId, text));
    } finally {
      setIsSearching(false);
    }
  }, [db, weddingId]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Typography variant="screenTitle">Search</Typography>
      </View>

      <View style={styles.searchBar}>
        <SearchInput
          placeholder="Search guests, events, vendors, expenses..."
          value={query}
          onChangeText={runSearch}
          autoFocus
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {query.trim().length < 2 ? (
          <View style={styles.hint}>
            <Ionicons name="search-outline" size={40} color={theme.colors.textMuted} />
            <Typography variant="bodySecondary" color={theme.colors.textSecondary} style={{ marginTop: 12, textAlign: 'center' }}>
              Search across guests, events, vendors, rooms, expenses, tasks, invitations and announcements.
            </Typography>
          </View>
        ) : results.length === 0 && !isSearching ? (
          <View style={styles.hint}>
            <Typography variant="body" color={theme.colors.textSecondary}>No results for "{query}"</Typography>
          </View>
        ) : (
          results.map((r) => (
            <Pressable key={`${r.entityType}-${r.id}`} onPress={() => router.push(r.route as any)}>
              <Card style={[styles.resultCard, { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[styles.iconBg, { backgroundColor: theme.colors.cardRose }]}>
                  <Ionicons name={ENTITY_ICONS[r.entityType]} size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Typography variant="body" weight="semibold" numberOfLines={1}>{r.title}</Typography>
                  {r.subtitle && <Typography variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>{r.subtitle}</Typography>}
                </View>
                <Typography variant="caption" weight="bold" color={theme.colors.textMuted}>{r.entityType}</Typography>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  searchBar: { paddingHorizontal: 24, marginBottom: 8 },
  content: { paddingHorizontal: 24 },
  hint: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  resultCard: { padding: 14, marginBottom: 10 },
  iconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
