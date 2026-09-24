import { Platform } from 'react-native';

// ─── Minimal Rescue Palette for FoodShelter Connect ─────────────────────────────
export const AppColors = {
  // Brand Core
  primary: '#18352b',      // Deep Forest Dark Green Ink
  secondary: '#d7ee85',    // Vibrant Lime Green
  accent: '#9fbd42',       // Lime Accent Green
  coral: '#ef8c5c',        // Soft Warm Orange / Coral
  green: '#91bc48',        // Fresh Rescue Green
  teal: '#5c9686',         // Sage Teal
  purple: '#8871a4',       // Soft Purple

  // Backgrounds & Surfaces
  bg: '#f4f2eb',           // Organic Cream
  surface: '#faf9f5',      // Paper Surface
  card: '#f7f7f2',         // Card Background
  cardAlt: '#e7eddc',      // Soft Sage Card Container
  border: '#dce2d8',       // Subtle Line Border
  borderFocus: '#9fbd42',  // Focused Line Border
  shadow: '#cbd7c2',       // Soft Organic Shadow

  // Status & Badges
  success: '#91bc48',
  warning: '#ef8c5c',
  danger: '#e05252',
  info: '#5c9686',

  // Typography
  textPrimary: '#18352b',
  textSecondary: '#6c7b73',
  textMuted: '#89958e',
  textWhite: '#ffffff',
  textHighlight: '#9fbd42',
} as const;

// ─── Spacing ───────────────────────────────────────────────────────────────────
export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Spacing = AppSpacing;

// ─── Border Radius ─────────────────────────────────────────────────────────────
export const AppRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

// ─── Typography Specs ──────────────────────────────────────────────────────────
export const AppTypography = {
  display: { fontSize: 32, fontWeight: '800' as const },
  h1: { fontSize: 26, fontWeight: '800' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  micro: { fontSize: 10, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2 as number },
} as const;

// ─── Shadows ───────────────────────────────────────────────────────────────────
export const AppShadows = {
  sm: {
    shadowColor: '#30453a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#30453a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#30453a',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  limeGlow: {
    shadowColor: '#d7ee85',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  inkGlow: {
    shadowColor: '#18352b',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
} as const;

// ─── Legacy Expo Theme Compatibility ───────────────────────────────────────────
export const Colors = {
  light: {
    text: AppColors.textPrimary,
    background: AppColors.bg,
    backgroundElement: '#e7eddc',
    backgroundSelected: '#dfe8d6',
    textSecondary: AppColors.textSecondary,
  },
  dark: {
    text: '#ffffff',
    background: '#18352b',
    backgroundElement: '#21493b',
    backgroundSelected: '#2c5949',
    textSecondary: '#adbbb0',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "monospace",
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
