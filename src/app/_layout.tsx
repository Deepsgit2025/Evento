
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

  // Top-level route group (e.g. 'auth' vs '(tabs)'). Actions like signing up,
  // logging in, or creating/joining a wedding change the underlying session
  // and wedding rows without going through this component, so the auth state
  // captured on first mount goes stale. Re-fetching it fresh every time the
  // user crosses in or out of the auth group (rather than caching it once)
  // avoids bouncing a freshly-authenticated user back to the login screen.
  const topSegment = segments[0];

  useEffect(() => {
    let active = true;
    const fetchAuthAndRoute = async () => {
      let session: any = null;
      let wedding: any = null;
      try {
        session = await AuthService.getCurrentSession(db);
        if (session) {
          wedding = await getUserWedding(db, session.id);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      }

      if (!active) return;
      setAuthState({ session, wedding });

      const inAuthGroup = topSegment === 'auth';
      const isAuthJoin = inAuthGroup && (segments as string[])[1] === 'join';

      if (!session) {
        // No session, ensure they are in auth group
        if (!inAuthGroup) {
          router.replace('/auth/login');
        }
      } else if (!wedding) {
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

      setIsReady(true);
      try { SplashScreen.hideAsync(); } catch {}
    };
    fetchAuthAndRoute();
    return () => { active = false; };
  }, [db, topSegment]);

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
