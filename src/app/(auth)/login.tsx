import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';
import { isProfileComplete } from '../../api/authService';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const handleSignIn = async () => {
    setValidationError(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setValidationError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    const success = await signIn(cleanEmail, password);
    if (success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      const activeUser = useAuthStore.getState().user;
      if (isProfileComplete(activeUser)) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const success = await signInWithGoogle();
    if (success) {
      const activeUser = useAuthStore.getState().user;
      if (isProfileComplete(activeUser)) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }
  };

  const displayError = validationError || authError;

  return (
    <ScreenContainer scrollable>
      <Header showBack onBack={() => router.back()} />

      <View style={styles.content}>
        <Typography variant="h1" style={styles.title}>
          Sign in to BooffIn
        </Typography>

        <Typography variant="body" color={colors.textSecondary} style={styles.subtitle}>
          Enter your academic credentials or personal account to explore research discussions.
        </Typography>

        {/* Google Single Sign-On Button */}
        <View style={styles.oauthButtonGroup}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.88}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <GoogleIcon size={20} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Typography variant="micro" color={colors.textMuted} style={styles.dividerText}>
            OR SIGN IN WITH EMAIL
          </Typography>
          <View style={styles.dividerLine} />
        </View>

        {/* Error Banner */}
        {displayError && (
          <View style={styles.errorBanner}>
            <Typography variant="caption" color={colors.accentRed}>
              {displayError}
            </Typography>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="scientist@university.edu"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (validationError) setValidationError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon="Inbox"
          />

          <Input
            label="Password"
            placeholder="••••••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (validationError) setValidationError(null);
            }}
            secureTextEntry={!showPassword}
            leftIcon="Shield"
            rightIcon={showPassword ? 'EyeOff' : 'Eye'}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <View style={styles.forgotRow}>
            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)}>
              <Typography variant="caption" color={colors.accentLink} style={{ fontWeight: '600' }}>
                Forgot Password?
              </Typography>
            </TouchableOpacity>
          </View>

          <Button
            title={isLoading ? 'Signing In...' : 'Sign In with Password'}
            variant="primary"
            size="lg"
            onPress={handleSignIn}
            disabled={isLoading}
            style={styles.signInButton}
          />
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerRow}>
          <Typography variant="caption" color={colors.textSecondary}>
            Do not have an account yet?{' '}
          </Typography>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(auth)/signup',
                params: { email: email.trim() || undefined },
              })
            }
          >
            <Typography variant="captionBold" color={colors.textPrimary}>
              Sign Up
            </Typography>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  title: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  oauthButtonGroup: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: layout.buttonHeights.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  googleButtonText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  form: {
    marginBottom: spacing.xl,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  signInButton: {
    marginTop: spacing.xs,
    width: '100%',
  },
  demoSection: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  demoHeader: {
    marginBottom: spacing.sm,
  },
  demoList: {
    gap: spacing.xs,
  },
  demoUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  demoUserMeta: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  demoUserName: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  demoUserRole: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
});
