import { Platform } from 'react-native';

export const lightColors = {
  // Royal Creamy Gold Palette — deep wine as the "royal" primary, warm gold
  // as the accent, set against an ivory/creamy base.
  primary: '#7A1F3D',       // Royal wine/maroon
  primaryLight: '#9A3057',  // Lighter wine
  primaryDark: '#57162C',   // Deeper wine
  primaryPressed: '#57162C',

  accent: '#C9A227',        // Rich gold
  accentLight: '#E0C158',   // Light gold
  accentDark: '#9C7B1C',    // Dark gold / bronze

  background: '#FDF7E8',    // Creamy ivory
  surface: '#FFFEFA',       // Warm off-white
  surfaceElevated: '#FFFFFF',

  text: '#2E2013',          // Deep warm brown-black
  textSecondary: '#6B5D4A', // Warm taupe
  textMuted: '#A99A80',     // Warm muted tan

  border: '#E9DDBE',        // Warm gold-tinted border
  borderLight: '#F5EFDA',   // Very light cream border

  success: '#16A34A',       // Emerald green
  warning: '#C9A227',       // Gold (doubles as warning to stay on-palette)
  error: '#B3261E',         // Deep red

  disabled: '#E9DDBE',
  disabledText: '#A99A80',

  // Gradient color stops
  gradientStart: '#7A1F3D',
  gradientEnd: '#C9A227',   // Wine → gold
  gradientGold: '#C9A227',

  // Card overlay backgrounds
  cardPurple: '#F1E6EC',    // Soft plum tint
  cardGold: '#FBF0D1',      // Light gold
  cardGreen: '#E7F2E2',     // Light green
  cardRose: '#F5E3E9',      // Light wine/blush
  isDark: false,
};

export const darkColors = {
  // Royal Creamy Gold — dark mode variant (deep espresso base, glowing gold)
  primary: '#C2517A',       // Brighter wine/rose for dark contrast
  primaryLight: '#D97A9B',
  primaryDark: '#8F3358',
  primaryPressed: '#8F3358',

  accent: '#E5C158',        // Bright gold
  accentLight: '#F0D385',
  accentDark: '#B8933B',

  background: '#18140D',    // Deep espresso brown
  surface: '#241E14',       // Slightly elevated warm dark
  surfaceElevated: '#2F281B',

  text: '#F5EEDC',          // Creamy near-white
  textSecondary: '#C9BB9E', // Warm light taupe
  textMuted: '#8C7F67',     // Muted warm grey-brown

  border: '#3D3423',        // Warm dark border
  borderLight: '#2A2417',   // Very dark warm border

  success: '#22C55E',
  warning: '#E5C158',
  error: '#E5605A',

  disabled: '#3D3423',
  disabledText: '#8C7F67',

  // Gradient color stops
  gradientStart: '#7A1F3D',
  gradientEnd: '#C9A227',
  gradientGold: '#E5C158',

  // Card overlay backgrounds (darker tints)
  cardPurple: '#2E2430',
  cardGold: '#3A2E10',
  cardGreen: '#173322',
  cardRose: '#3A1723',
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
    shadowColor: '#7A1F3D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#7A1F3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#7A1F3D',
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
