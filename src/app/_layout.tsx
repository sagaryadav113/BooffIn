import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, shadows } from '../theme';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';
import { useAuthStore } from '../store/useAuthStore';

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <View style={styles.outerContainer}>
          <View style={styles.mobileFrame}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            >
              {/* Main Tabs Group */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

              {/* Authentication & Onboarding Group */}
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />

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
            </Stack>
          </View>
        </View>
      </ErrorBoundary>
    </SafeAreaProvider>
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
          minHeight: '100vh' as any,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          ...shadows.card,
        }
      : {}),
  },
});
