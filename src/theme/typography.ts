import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

const fontSerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, Cambria, "Times New Roman", Times, serif',
});

export const fontSizes = {
  micro: 11,
  captionSmall: 12,
  caption: 13,
  bodySmall: 14,
  body: 15,
  bodyLarge: 16,
  contentTitle: 18,
  titleSmall: 18,
  titleMedium: 20,
  sectionTitle: 22,
  titleLarge: 22,
  headingMedium: 24,
  pageTitle: 28,
  headingLarge: 32,
  displaySmall: 36,
  display: 40,
};

export const fontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  heavy: '800' as TextStyle['fontWeight'],
};

export const lineHeights = {
  tight: 1.15,
  heading: 1.25,
  normal: 1.45,
  body: 1.5,
  relaxed: 1.6,
};

export const typography = {
  // Hero & Authentication Headings (32–40px / 700 / tight 1.1–1.2)
  display: {
    fontFamily,
    fontSize: fontSizes.display,
    fontWeight: fontWeights.heavy,
    letterSpacing: -1,
    lineHeight: 46,
  },
  displaySmall: {
    fontFamily,
    fontSize: fontSizes.displaySmall,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.8,
    lineHeight: 42,
  },

  // Major Page Titles (28–32px / 700 / 1.2)
  pageTitle: {
    fontFamily,
    fontSize: fontSizes.pageTitle,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.6,
    lineHeight: 34,
  },

  // Headings hierarchy for backward compatibility
  h1: {
    fontFamily,
    fontSize: fontSizes.headingLarge,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.7,
    lineHeight: 38,
  },
  h2: {
    fontFamily,
    fontSize: fontSizes.pageTitle,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.6,
    lineHeight: 34,
  },

  // Section Titles (20–24px / 600 / 1.25)
  sectionTitle: {
    fontFamily,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  h3: {
    fontFamily,
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.4,
    lineHeight: 28,
  },

  // Content / Post / Paper Titles (18–22px / 600 / 1.3)
  contentTitle: {
    fontFamily,
    fontSize: fontSizes.contentTitle,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.25,
    lineHeight: 24,
  },
  h4: {
    fontFamily,
    fontSize: fontSizes.contentTitle,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.2,
    lineHeight: 24,
  },

  titleSerif: {
    fontFamily: fontSerif,
    fontSize: fontSizes.titleMedium,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
    lineHeight: 26,
  },

  // Body Text (15–16px / 400 / 1.5)
  bodyLarge: {
    fontFamily,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.regular,
    lineHeight: 24,
  },
  bodyLargeMedium: {
    fontFamily,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.medium,
    lineHeight: 24,
  },
  bodyLargeBold: {
    fontFamily,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: 23,
  },
  bodyMedium: {
    fontFamily,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    lineHeight: 23,
  },
  bodyBold: {
    fontFamily,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    lineHeight: 23,
  },

  // Labels & Navigation (14–16px / 500–600)
  label: {
    fontFamily,
    fontSize: fontSizes.bodySmall,
    fontWeight: fontWeights.medium,
    lineHeight: 20,
  },
  labelBold: {
    fontFamily,
    fontSize: fontSizes.bodySmall,
    fontWeight: fontWeights.semibold,
    lineHeight: 20,
  },

  // Secondary Text & Metadata (13–14px / 400–500)
  caption: {
    fontFamily,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    lineHeight: 18,
  },
  captionMedium: {
    fontFamily,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  },
  captionBold: {
    fontFamily,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    lineHeight: 18,
  },

  // Small Timestamps & Micro-metadata (11–12px / 500)
  metadata: {
    fontFamily,
    fontSize: fontSizes.captionSmall,
    fontWeight: fontWeights.medium,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  micro: {
    fontFamily,
    fontSize: fontSizes.micro,
    fontWeight: fontWeights.medium,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
  microBold: {
    fontFamily,
    fontSize: fontSizes.micro,
    fontWeight: fontWeights.bold,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
};
