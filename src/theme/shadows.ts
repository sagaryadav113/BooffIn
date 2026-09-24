import { ViewStyle, Platform } from 'react-native';

/**
 * BooffIn Design System - Restrained Shadows
 * Subtle, soft ambient shadows avoiding heavy artificial skeuomorphism.
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  subtle: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    default: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    },
  }) as ViewStyle,

  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    default: {
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
    },
  }) as ViewStyle,

  floating: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
    default: {
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.1)',
    },
  }) as ViewStyle,
};

export type Shadows = typeof shadows;
