import React, { createContext, useContext } from 'react';
import { lightColors, Theme } from './index';
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
  // The app is light-mode only by product decision, so there is no mode to
  // resolve, persist or restore — it stays light whatever the system says.
  const mode: ThemeMode = 'light';
  const setMode = () => {};

  const activeColors = lightColors;

  const activeTheme: Theme = {
    colors: activeColors,
    spacing,
    radii,
    typography,
    shadows,
  };

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
