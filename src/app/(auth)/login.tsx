import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { Avatar } from '../../components/core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { mockUsers } from '../../data/mockData';
import { UserProfile } from '../../types';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithORCID = useAuthStore((s) => s.signInWithORCID);
  const signInWithDemoUser = useAuthStore((s) => s.signInWithDemoUser);
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
      router.replace('/(tabs)');
    }
  };

  const handleGoogleSignIn = async () => {
    setValidationError(null);
    clearError();
    const success = await signInWithGoogle();
    const state = useAuthStore.getState();
    if (success && state.isAuthenticated) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      router.replace('/(tabs)');
    } else if (state.authError) {
      setValidationError(state.authError);
    }
  };

  const handleORCIDSignIn = async () => {
    setValidationError(null);
    clearError();
    const success = await signInWithORCID();
    const state = useAuthStore.getState();
    if (success && state.isAuthenticated) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      router.replace('/(tabs)');
    } else if (state.authError) {
      setValidationError(state.authError);
    }
  };

  const handleDemoSignIn = (user: UserProfile) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    signInWithDemoUser(user);
    router.replace('/(tabs)');
  };

  const displayError = validationError || authError;

  return (
    <ScreenContainer scrollable>
      <Header showBack onBack={() => router.replace('/(auth)/welcome')} />

      <View style={styles.content}>
        <Typography variant="h1" style={styles.title}>
          Sign in to BooffIn
        </Typography>

        <Typography variant="body" color={colors.textSecondary} style={styles.subtitle}>
          Enter your academic credentials or personal account to explore research discussions.
        </Typography>

        {/* OAuth Buttons Group */}
        <View style={styles.oauthButtonGroup}>
          {/* Google Single Sign-On Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.88}
            disabled={isLoading}
          >
            <View style={styles.googleIconBadge}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* ORCID Quick Auth Button */}
          <TouchableOpacity
            style={styles.orcidButton}
            onPress={handleORCIDSignIn}
            activeOpacity={0.88}
            disabled={isLoading}
          >
            <View style={styles.orcidLogoCircle}>
              <Text style={styles.orcidLogoText}>iD</Text>
            </View>
            <Text style={styles.orcidButtonText}>Continue with ORCID iD</Text>
            <CheckCircle2 size={16} color={colors.white} style={{ marginLeft: 4 }} />
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

        {/* Quick Demo Accounts Drawer for Fast Testing */}
        <View style={styles.demoSection}>
          <View style={styles.demoHeader}>
            <Typography variant="captionBold" color={colors.textPrimary}>
              Quick Demo Accounts (Instant Testing)
            </Typography>
            <Typography variant="micro" color={colors.textSecondary}>
              Tap any profile to log in instantly
            </Typography>
          </View>

          <View style={styles.demoList}>
            {mockUsers.slice(0, 4).map((user) => (
              <TouchableOpacity
                key={user.id}
                onPress={() => handleDemoSignIn(user)}
                activeOpacity={0.8}
                style={styles.demoUserCard}
              >
                <Avatar
                  url={user.avatarUrl}
                  name={user.fullName}
                  size={36}
                  verified={user.orcidVerified}
                />
                <View style={styles.demoUserMeta}>
                  <Text style={styles.demoUserName}>{user.fullName}</Text>
                  <Text style={styles.demoUserRole} numberOfLines={1}>
                    {user.academicTitle} · {user.institution}
                  </Text>
                </View>
                <ArrowRight size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerRow}>
          <Typography variant="caption" color={colors.textSecondary}>
            Do not have an account yet?{' '}
          </Typography>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
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
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  googleIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
  },
  googleButtonText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  orcidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A6CE39', // Official ORCID Brand Color
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  orcidLogoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidLogoText: {
    color: '#A6CE39',
    fontWeight: '900',
    fontSize: 11,
  },
  orcidButtonText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
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
