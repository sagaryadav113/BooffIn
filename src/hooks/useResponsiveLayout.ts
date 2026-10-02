import { useWindowDimensions, Platform } from 'react-native';

export interface ResponsiveLayout {
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  width: number;
  height: number;
}

/**
 * Breakpoint constants
 * Mobile: < 768px
 * Tablet: 768px - 1023px
 * Desktop: >= 1024px
 */
export const DESKTOP_BREAKPOINT = 1024;
export const TABLET_BREAKPOINT = 768;

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  // Mobile native (Android/iOS APK) is always mobile layout
  if (Platform.OS !== 'web') {
    return {
      isDesktop: false,
      isTablet: false,
      isMobile: true,
      width,
      height,
    };
  }

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = width < TABLET_BREAKPOINT;

  return {
    isDesktop,
    isTablet,
    isMobile,
    width,
    height,
  };
}
