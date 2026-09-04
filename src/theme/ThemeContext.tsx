import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors, Theme } from './index';
import { spacing, radii, typography, shadows } from './index';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: typeof lightColors;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedMode = await SecureStore.getItemAsync('app_theme_mode');
        if (savedMode && ['system', 'light', 'dark'].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      } finally {
        setIsReady(true);
      }
    }
    loadTheme();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await SecureStore.setItemAsync('app_theme_mode', newMode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const isDarkMode = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const activeColors = isDarkMode ? darkColors : lightColors;
  
  const activeTheme: Theme = {
    colors: activeColors,
    spacing,
    radii,
    typography,
    shadows,
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors: activeColors, theme: activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
