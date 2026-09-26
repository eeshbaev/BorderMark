/** BorderMark brand palette — single source of truth for app.json / native assets. */
export const brandColors = {
  navy: '#0F1B2D',
  teal: '#3E7C78',
  cream: '#F7F5F2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export const lightColors = {
  background: brandColors.cream,
  surface: '#FFFFFF',
  primary: brandColors.navy,
  onPrimary: '#FFFFFF',
  text: brandColors.navy,
  textSecondary: '#5C6678',
  border: '#E6E1DA',
  accent: brandColors.teal,
  accentMuted: '#E8F0EF',
  onAccent: '#FFFFFF',
  warning: '#C9822E',
  urgent: '#B42318',
  muted: '#8A93A3',
  overlay: 'rgba(15, 27, 45, 0.35)',
} as const;

export const darkColors = {
  background: '#0B1220',
  surface: '#141D2E',
  primary: '#E8EDF5',
  onPrimary: brandColors.navy,
  text: '#E8EDF5',
  textSecondary: '#A8B0C0',
  border: '#243047',
  accent: '#5EA8A3',
  accentMuted: '#1A3331',
  onAccent: brandColors.navy,
  warning: '#E0A35A',
  urgent: '#F97066',
  muted: '#7B8798',
  overlay: 'rgba(0, 0, 0, 0.55)',
} as const;

export const cardShadow = {
  shadowColor: brandColors.navy,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

export const typography = {
  greeting: 18,
  hero: 30,
  section: 21,
  title: 17,
  body: 15,
  caption: 13,
  label: 12,
} as const;

export const radii = {
  card: 16,
  button: 12,
  sheet: 20,
} as const;

export type ThemeColors = typeof lightColors | typeof darkColors;

export function getThemeColors(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}
