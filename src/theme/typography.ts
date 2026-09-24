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
  caption: 13,
  bodySmall: 14,
  body: 15,
  bodyLarge: 16,
  titleSmall: 18,
  titleMedium: 20,
  titleLarge: 22,
  headingMedium: 26,
  headingLarge: 32,
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
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.6,
};

export const typography = {
  display: {
    fontFamily,
    fontSize: fontSizes.display,
    fontWeight: fontWeights.heavy,
    letterSpacing: -1,
    lineHeight: 46,
  },
  h1: {
    fontFamily,
    fontSize: fontSizes.headingLarge,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.7,
    lineHeight: 38,
  },
  h2: {
    fontFamily,
    fontSize: fontSizes.headingMedium,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  h3: {
    fontFamily,
    fontSize: fontSizes.titleLarge,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h4: {
    fontFamily,
    fontSize: fontSizes.titleSmall,
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
  bodyLarge: {
    fontFamily,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.regular,
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    lineHeight: 22,
  },
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
  micro: {
    fontFamily,
    fontSize: fontSizes.micro,
    fontWeight: fontWeights.medium,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  microBold: {
    fontFamily,
    fontSize: fontSizes.micro,
    fontWeight: fontWeights.bold,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
};
