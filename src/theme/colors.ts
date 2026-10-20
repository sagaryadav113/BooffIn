/**
 * BooffIn Design System - Color Tokens
 * Scientific, minimal, calm, and trustworthy palette with elevation depth for dark mode.
 */
export const lightColors = {
  // Base Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F1F3F5',
  backgroundCard: '#FFFFFF',
  cardBackground: '#FFFFFF',
  backgroundElevated: '#FFFFFF',

  // Monochromatic Grays (Slate / Zinc scale)
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  gray950: '#0B0F17',

  // Pure Constants
  black: '#000000',
  white: '#FFFFFF',
  primary: '#000000',

  // Borders & Separators
  border: '#EBECEF',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  borderFocused: '#111827',

  // Typography Hierarchy
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#64748B',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Scientific Journal Accents
  journalNature: '#DC2626', // Nature classic crimson
  journalScience: '#D97706', // Science gold/amber
  journalCell: '#0284C7', // Cell cyan/blue
  journalBioRxiv: '#991B1B', // bioRxiv dark maroon
  journalArXiv: '#B45309', // arXiv deep bronze
  journalPnas: '#4F46E5', // PNAS indigo
  journalProtocols: '#059669', // Nature Protocols emerald

  // Interactive Accents & Feedback
  accentBlue: '#2563EB', // Links and interactive triggers
  accentLink: '#2563EB', // Semantic alias for links
  accentBlueHover: '#1D4ED8',
  accentGreen: '#10B981', // Open Access / verified
  brandGreen: '#064E3B', // BooffIn deep forest green
  brandDarkGreen: '#064E3B',
  accentRed: '#EF4444', // Likes and error alerts
  error: '#EF4444',
  accentOrange: '#F59E0B', // Trending alerts

  // Overlays & Backdrop
  backdrop: 'rgba(0, 0, 0, 0.45)',
  surfaceHover: 'rgba(0, 0, 0, 0.03)',
  surfacePressed: 'rgba(0, 0, 0, 0.06)',
};

export const darkColors: typeof lightColors = {
  // Base Backgrounds (Obsidian Slate Elevation System)
  background: '#0B0F17',
  backgroundSecondary: '#111622',
  backgroundTertiary: '#161D2A',
  backgroundCard: '#161B26',
  cardBackground: '#161B26',
  backgroundElevated: '#1F2636',

  // Monochromatic Grays (Inverted for Dark Elevation)
  gray50: '#111622',
  gray100: '#161D2A',
  gray200: '#1F2636',
  gray300: '#2E384D',
  gray400: '#4B5565',
  gray500: '#6B7280',
  gray600: '#94A3B8',
  gray700: '#CBD5E1',
  gray800: '#E2E8F0',
  gray900: '#F1F5F9',
  gray950: '#F8FAFC',

  // Pure Constants
  black: '#000000',
  white: '#FFFFFF',
  primary: '#10B981',

  // Borders & Separators (Refined Low-Glare Lines)
  border: '#222A3A',
  borderLight: '#1A2230',
  borderDark: '#2D3748',
  borderFocused: '#10B981',

  // Typography Hierarchy (Anti-Glare Luma Calibrated)
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textMuted: '#64748B',
  textInverse: '#0B0F17',

  // Scientific Journal Accents (Pastel-Balanced)
  journalNature: '#F87171',
  journalScience: '#FBBF24',
  journalCell: '#38BDF8',
  journalBioRxiv: '#EF4444',
  journalArXiv: '#F59E0B',
  journalPnas: '#818CF8',
  journalProtocols: '#34D399',

  // Interactive Accents & Feedback
  accentBlue: '#3B82F6',
  accentLink: '#60A5FA',
  accentBlueHover: '#93C5FD',
  accentGreen: '#10B981',
  brandGreen: '#10B981', // Emerald shift for dark mode readability
  brandDarkGreen: '#059669',
  accentRed: '#F87171',
  error: '#F87171',
  accentOrange: '#FBBF24',

  // Overlays & Backdrop
  backdrop: 'rgba(0, 0, 0, 0.75)',
  surfaceHover: 'rgba(255, 255, 255, 0.04)',
  surfacePressed: 'rgba(255, 255, 255, 0.08)',
};

/**
 * Default fallback colors export for backward-compatibility with existing code
 */
export const colors = lightColors;
export type Colors = typeof lightColors;
