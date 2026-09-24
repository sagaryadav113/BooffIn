/**
 * BooffIn Design System - Color Tokens
 * Scientific, minimal, calm, and trustworthy monochrome palette with journal accents.
 */
export const colors = {
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

  // Borders & Separators
  border: '#EBECEF',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  borderFocused: '#111827',

  // Typography Hierarchy
  textPrimary: '#111827',
  textSecondary: '#6B7280',
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
  accentRed: '#EF4444', // Likes and error alerts
  error: '#EF4444',
  accentOrange: '#F59E0B', // Trending alerts

  // Overlays & Backdrop
  backdrop: 'rgba(0, 0, 0, 0.45)',
  surfaceHover: 'rgba(0, 0, 0, 0.03)',
  surfacePressed: 'rgba(0, 0, 0, 0.06)',
};

export type Colors = typeof colors;
