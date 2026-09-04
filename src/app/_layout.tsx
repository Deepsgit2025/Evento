
import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { initializeDatabase } from '../database';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { SyncProvider } from '../context/SyncContext';
import { LanguageProvider } from '../i18n';
import { AuthService } from '../services/auth';
import { getUserWedding } from '../services/wedding';

SplashScreen.preventAutoHideAsync();

function InitialRoot() {
  const router = useRouter();
  const segments = useSegments();
  const db = useSQLiteContext();
  const { theme, mode } = useTheme();
  
  const [isReady, setIsReady] = useState(false);
  const [authState, setAuthState] = useState<{session: any, wedding: any} | null>(null);

  // 1. Fetch auth state once on mount
  useEffect(() => {
    let active = true;
    const fetchAuth = async () => {
      try {
        const session = await AuthService.getCurrentSession(db);
        let wedding = null;
        if (session) {
          wedding = await getUserWedding(db, session.id);
        }
        if (active) {
          setAuthState({ session, wedding });
          setIsReady(true);
          try { SplashScreen.hideAsync(); } catch {}
        }
      } catch (e) {
        console.error('Auth init error:', e);
        if (active) {
          setAuthState({ session: null, wedding: null });
          setIsReady(true);
          try { SplashScreen.hideAsync(); } catch {}
        }
      }
    };
    fetchAuth();
    return () => { active = false; };
  }, [db]);

  // 2. React to segments + authState changes to route the user
  useEffect(() => {
    if (!isReady || !authState) return;

    const inAuthGroup = segments[0] === 'auth';
    const isAuthJoin = inAuthGroup && segments[1] === 'join';

    if (!authState.session) {
      // No session, ensure they are in auth group
      if (!inAuthGroup) {
        router.replace('/auth/login');
      }
    } else if (!authState.wedding) {
      // Has session but no wedding, ensure they are at /auth/join
      if (!isAuthJoin) {
        router.replace('/auth/join');
      }
    } else {
      // Has session and wedding, prevent them from accessing auth screens
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [segments, isReady, authState]);

  if (!isReady) return null;

  return (
    <LanguageProvider>
      <SyncProvider>
        <StatusBar style={mode === 'dark' || theme.colors.isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
      </SyncProvider>
    </LanguageProvider>
  );
}

// Error boundary wrapper
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.error('App Error Boundary:', error.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.emoji}>😔</Text>
          <Text style={ebStyles.title}>Something went wrong</Text>
          <Text style={ebStyles.subtitle}>Please restart the app</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF7F9' },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#18181B', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#52525B' },
});

import React from 'react';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SQLiteProvider databaseName="evento.db" onInit={initializeDatabase}>
        <ThemeProvider>
          <InitialRoot />
        </ThemeProvider>
      </SQLiteProvider>
    </ErrorBoundary>
  );
}
