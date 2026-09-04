import { Platform } from 'react-native';

export const lightColors = {
  // Elegant Luxe — deep wine & antique gold on warm cream
  primary: '#7A1E3C',       // Deep wine / burgundy
  primaryLight: '#9C3457',  // Lighter wine
  primaryDark: '#54142A',   // Deeper wine
  primaryPressed: '#54142A',

  accent: '#B8934A',        // Antique gold
  accentLight: '#CDAD6F',   // Light antique gold
  accentDark: '#8F6F35',    // Dark antique gold

  background: '#FAF5EE',    // Warm cream
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  text: '#241419',          // Warm near-black
  textSecondary: '#6B5A5E', // Warm muted mauve-grey
  textMuted: '#A6969A',     // Soft warm grey

  border: '#E8DDD0',        // Warm beige border
  borderLight: '#F2EAE0',   // Very light warm border

  success: '#3F7A5C',       // Deep sage green
  warning: '#B8834A',       // Bronze amber
  error: '#B3261E',         // Deep red

  disabled: '#E8DDD0',
  disabledText: '#A6969A',

  // Gradient color stops
  gradientStart: '#8C2647',
  gradientEnd: '#4A1023',
  gradientGold: '#B8934A',

  // Card overlay backgrounds (soft tints)
  cardPurple: '#F1E3E9',    // Soft mauve tint
  cardGold: '#F7EEDC',      // Soft antique gold tint
  cardGreen: '#E3EDE6',     // Soft sage tint
  cardRose: '#F5E1E6',      // Soft wine tint
  isDark: false,
};

export const darkColors = {
  // Elegant Luxe — dark boutique-hotel palette
  primary: '#D65D7D',       // Bright wine-rose for dark-mode contrast
  primaryLight: '#E8899F',
  primaryDark: '#9C3457',
  primaryPressed: '#9C3457',

  accent: '#D4B876',        // Bright antique gold
  accentLight: '#E3CB93',
  accentDark: '#B8934A',

  background: '#151013',    // Near-black, warm wine undertone
  surface: '#221A1E',       // Elevated warm dark
  surfaceElevated: '#2C2226',

  text: '#F5ECEF',          // Warm near-white
  textSecondary: '#B8A8AD', // Soft warm light grey
  textMuted: '#7D6B70',     // Muted warm grey

  border: '#3A2C31',        // Dark warm border
  borderLight: '#2C2226',   // Very dark warm border

  success: '#5FA37E',       // Bright sage
  warning: '#D4A059',       // Bright bronze amber
  error: '#E5675E',         // Bright red

  disabled: '#3A2C31',
  disabledText: '#7D6B70',

  // Gradient color stops
  gradientStart: '#D65D7D',
  gradientEnd: '#7A1E3C',
  gradientGold: '#D4B876',

  // Card overlay backgrounds (darker tints)
  cardPurple: '#3A2530',
  cardGold: '#3D3220',
  cardGreen: '#1F3327',
  cardRose: '#3A2229',
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
  sm: 4,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
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

// Warm wine-tinted shadow system
export const shadows = {
  sm: {
    shadowColor: '#4A1023',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#4A1023',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4A1023',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
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
