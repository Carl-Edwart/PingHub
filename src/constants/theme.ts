export const COLORS = {
  // Primary
  primary: '#0D1B3E',
  primaryMid: '#1A3A6B',

  // Surface
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F4FF',

  // Accent
  accent: '#00C2FF',
  accentMuted: '#B3E9FF',

  // Text
  text: '#0D1B3E',
  textMuted: '#6B7A99',

  // Semantic
  danger: '#E84545',
  success: '#1DB87A',

  // Utility
  border: '#E2E8F5',
  background: '#F0F4FF',
} as const;

export const TYPOGRAPHY = {
  // Display (scoreboard)
  display: {
    fontSize: 80,
    fontWeight: '700' as const,
    lineHeight: 88,
    letterSpacing: -1,
  },

  // H1 (screen title)
  h1: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },

  // H2 (section title)
  h2: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: 0,
  },

  // Body
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },

  // Score sub-label (player name)
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },

  // Label/Caption
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 10,
  lg: 12,
  full: 9999,
} as const;

export const BUTTON_STYLES = {
  primary: {
    backgroundColor: COLORS.accent,
    color: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    fontWeight: '600' as const,
  },
  secondary: {
    backgroundColor: 'transparent',
    color: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    fontWeight: '600' as const,
  },
  destructive: {
    backgroundColor: COLORS.danger,
    color: '#FFFFFF',
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    fontWeight: '600' as const,
  },
} as const;

export const CARD_STYLES = {
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: BORDER_RADIUS.lg,
  padding: SPACING.lg,
} as const;

export const TAB_BAR = {
  backgroundColor: COLORS.primary,
  activeColor: COLORS.accent,
  inactiveColor: COLORS.textMuted,
  height: 60,
} as const;
