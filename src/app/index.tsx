import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { isProfileComplete } from '../api/authService';
import { colors } from '../theme';
import { BooffinLogo } from '../components/core/BooffinLogo';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <BooffinLogo size={64} />
        <ActivityIndicator size="small" color={colors.textPrimary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (isAuthenticated) {
    if (user && isProfileComplete(user)) {
      return <Redirect href="/(tabs)" />;
    }
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
