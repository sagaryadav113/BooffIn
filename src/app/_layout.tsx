import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaInsetsContext, EdgeInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '../theme';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

import { DesktopLayoutShell } from '../components/desktop/DesktopLayoutShell';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useUserPresence } from '../hooks/useUserPresence';
import { prewarmHypedFeeds } from '../api/hypedFeedService';

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const { isDesktop } = useResponsiveLayout();
  const segments = useSegments();
  const router = useRouter();

  // Track live user presence across all active sessions in real-time
  useUserPresence();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Global Realtime Notifications & Badge Synchronization
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    useNotificationStore.getState().loadUnreadCount();
    useWorkspaceStore.getState().loadWorkspaces();
    const unsubscribe = useNotificationStore.getState().subscribeToRealtimeNotifications(currentUser.id);
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, currentUser?.id]);

  // Global Auth Guard: Restrict unauthenticated users from entering protected app routes via browser URLs
  useEffect(() => {
    if (!isInitialized) return;

    const firstSegment = segments[0] as string | undefined;
    const isPublicRoute =
      !firstSegment ||
      firstSegment === '(auth)' ||
      firstSegment === 'auth' ||
      firstSegment === 'welcome' ||
      firstSegment === 'privacy' ||
      firstSegment === 'policy' ||
      firstSegment === 'terms' ||
      firstSegment === 'orcid-callback' ||
      firstSegment === 'reset-password';

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/(auth)/welcome');
    }
  }, [isInitialized, isAuthenticated, segments, router]);

  // Pre-warm Explore domain feeds in the background for 0ms instant loading
  useEffect(() => {
    const interests = currentUser?.researchInterests || [];
    prewarmHypedFeeds(interests);
  }, [currentUser?.id]);

  const stackContent = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isDesktop ? '#FFFFFF' : colors.background },
        animation: 'slide_from_right',
      }}
    >
      {/* Main Tabs Group */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Authentication & Onboarding Group */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />

      {/* Detail & Feature Routes */}
      <Stack.Screen
        name="paper/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="profile/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="topic/index"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="topic/[slug]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="search/index"
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="settings/index"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="admin/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <WebSafeAreaInsetsWrapper>
        <StatusBar style="dark" />
        <ErrorBoundary>
          {isDesktop ? (
            <DesktopLayoutShell>{stackContent}</DesktopLayoutShell>
          ) : (
            <View style={styles.outerContainer}>
              <View style={styles.mobileFrame}>
                {stackContent}
              </View>
            </View>
          )}
        </ErrorBoundary>
      </WebSafeAreaInsetsWrapper>
    </SafeAreaProvider>
  );
}

function WebSafeAreaInsetsWrapper({ children }: { children: React.ReactNode }) {
  const currentInsets = React.useContext(SafeAreaInsetsContext);
  const [windowDimensions, setWindowDimensions] = React.useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const resolvedInsets = React.useMemo<EdgeInsets | null>(() => {
    if (Platform.OS !== 'web') {
      return currentInsets;
    }

    if (typeof window === 'undefined') {
      return currentInsets || { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const width = windowDimensions.width || window.innerWidth || 0;
    const isMobileWidth = width < 768;

    // Detect iOS devices (iPhone, iPad, iPod)
    const isIos =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // Probe CSS env safe-area-inset if available in browser
    let cssTop = 0;
    let cssBottom = 0;
    try {
      const probe = document.createElement('div');
      probe.style.position = 'fixed';
      probe.style.visibility = 'hidden';
      probe.style.top = '0';
      probe.style.left = '0';
      probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
      probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
      document.body.appendChild(probe);
      const computed = window.getComputedStyle(probe);
      cssTop = parseInt(computed.paddingTop, 10) || 0;
      cssBottom = parseInt(computed.paddingBottom, 10) || 0;
      document.body.removeChild(probe);
    } catch {}

    const isStandalone =
      Boolean((window.navigator as any)?.standalone) ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

    let topInset = currentInsets?.top || 0;
    let bottomInset = currentInsets?.bottom || 0;

    if (cssTop > 0) {
      topInset = Math.max(topInset, cssTop);
    } else if (isIos && isMobileWidth) {
      // In iOS Safari on mobile devices, provide status bar clearance so header doesn't overlap clock/notch
      topInset = Math.max(topInset, 47);
    }

    if (cssBottom > 0) {
      bottomInset = Math.max(bottomInset, cssBottom);
    } else if (isIos && isStandalone && isMobileWidth) {
      // Home indicator bar in standalone PWA mode
      bottomInset = Math.max(bottomInset, 34);
    }

    return {
      top: topInset,
      bottom: bottomInset,
      left: currentInsets?.left || 0,
      right: currentInsets?.right || 0,
    };
  }, [currentInsets, windowDimensions]);

  if (!resolvedInsets || Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <SafeAreaInsetsContext.Provider value={resolvedInsets}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F3F4F6' : colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100dvh' as any,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          ...shadows.card,
        }
      : {}),
  },
});
