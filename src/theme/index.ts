import { Platform } from 'react-native';

export const lightColors = {
  // Premium Indian Wedding Palette
  primary: '#E11D48',       // Rose
  primaryLight: '#F43F5E',  // Lighter Rose
  primaryDark: '#BE123C',   // Deeper Rose
  primaryPressed: '#BE123C',
  
  accent: '#F59E0B',        // Gold
  accentLight: '#FBBF24',   // Light gold
  accentDark: '#D97706',    // Dark gold

  background: '#FFF7F9',    // Warm Rose tinted cream
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  text: '#18181B',          // Charcoal Black
  textSecondary: '#52525B', // Muted grey
  textMuted: '#A1A1AA',     // Soft grey
  
  border: '#E4E4E7',        // Light grey border
  borderLight: '#F4F4F5',   // Very light grey
  
  success: '#16A34A',       // Emerald green
  warning: '#F59E0B',       // Amber
  error: '#DC2626',         // Red
  
  disabled: '#E4E4E7',      // Muted grey
  disabledText: '#A1A1AA',
  
  // Gradient color stops
  gradientStart: '#E11D48',
  gradientEnd: '#C026D3',   // Orchid
  gradientGold: '#F59E0B',
  
  // Card overlay backgrounds
  cardPurple: '#FDF4FF',    // Light Orchid
  cardGold: '#FEF3C7',      // Light Gold
  cardGreen: '#DCFCE7',     // Light Green
  cardRose: '#FFE4E6',      // Light Rose
  isDark: false,
};

export const darkColors = {
  // Premium Dark Theme Palette
  primary: '#F43F5E',       // Brighter Rose for dark mode contrast
  primaryLight: '#FB7185',  
  primaryDark: '#BE123C',   
  primaryPressed: '#9F1239',
  
  accent: '#FBBF24',        // Brighter Gold
  accentLight: '#FCD34D',   
  accentDark: '#D97706',    

  background: '#121212',    // True Dark Charcoal
  surface: '#1E1E1E',       // Slightly elevated dark
  surfaceElevated: '#2A2A2A',
  
  text: '#F4F4F5',          // Near White
  textSecondary: '#A1A1AA', // Soft light grey
  textMuted: '#71717A',     // Muted grey
  
  border: '#3F3F46',        // Dark grey border
  borderLight: '#27272A',   // Very dark grey
  
  success: '#22C55E',       // Bright emerald
  warning: '#FBBF24',       // Amber
  error: '#EF4444',         // Bright red
  
  disabled: '#3F3F46',      
  disabledText: '#71717A',
  
  // Gradient color stops
  gradientStart: '#E11D48',
  gradientEnd: '#C026D3',   
  gradientGold: '#F59E0B',
  
  // Card overlay backgrounds (darker tints)
  cardPurple: '#3B0764',    
  cardGold: '#451A03',      
  cardGreen: '#064E3B',     
  cardRose: '#4C0519',      
  isDark: true,
};

// Fallback legacy colors (so imports don't immediately break until we use the hook)
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
  sizes: {
    xs: 12,
    sm: 14,
    md: 15,      // Slightly larger base for mobile readability
    lg: 17,      // Card titles
    xl: 20,      // Section titles
    xxl: 26,     // Screen titles
    display: 34, // Hero display
    hero: 40,    // Large hero headings
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

// Richer shadow system with warm tones
export const shadows = {
  sm: {
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
};

export type Theme = typeof theme;
