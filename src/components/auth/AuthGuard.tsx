import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Button } from '../core/Button';
import { BooffinLogo } from '../core/BooffinLogo';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallbackMessage = 'You must be signed in to access this scientific feature.',
  redirectTo = '/(auth)/login',
}) => {
  const { isAuthenticated, authStatus, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && authStatus === 'unauthenticated') {
      // Optional automatic redirect
    }
  }, [isLoading, authStatus]);

  if (authStatus === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
        <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          Verifying scientific credentials...
        </Typography>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.barrierContainer}>
        <BooffinLogo size={64} style={styles.logo} />
        <Typography variant="h2" align="center" style={styles.title}>
          Authentication Required
        </Typography>
        <Typography variant="body" color={colors.textSecondary} align="center" style={styles.subtitle}>
          {fallbackMessage}
        </Typography>
        <View style={styles.buttonGroup}>
          <Button
            title="Sign In to BooffIn"
            variant="primary"
            size="lg"
            onPress={() => router.push(redirectTo as any)}
            style={styles.button}
          />
          <Button
            title="Back to Feed"
            variant="ghost"
            size="md"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  barrierContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  logo: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  buttonGroup: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
});
