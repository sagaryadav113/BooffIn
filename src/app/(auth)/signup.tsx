import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Input } from '../../components/core/Input';
import { useAuthStore } from '../../store/useAuthStore';

export default function SignupScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const cleanEmail = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const isPasswordValid = password.length >= 6;

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.back();
  };

  const handleCreateAccount = async () => {
    setValidationError(null);
    clearError();

    if (!isEmailValid) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const success = await signUp({
      email: cleanEmail,
      password,
    });

    if (success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      // Seamlessly transition to the progressive researcher onboarding flow
      router.replace('/(auth)/onboarding');
    }
  };

  const displayError = validationError || authError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            <View style={styles.contentContainer}>
              {/* Form Section */}
              <View style={styles.topSection}>
                <Text style={styles.title}>Create your password</Text>
                <Text style={styles.subtitle}>
                  Choose a secure password (at least 6 characters) to set up your BooffIn account.
                </Text>

                {/* Email Display / Input */}
                <View style={styles.emailBadge}>
                  <Text style={styles.emailBadgeLabel}>ACCOUNT EMAIL</Text>
                  <Text style={styles.emailBadgeValue}>{cleanEmail || 'scientist@university.edu'}</Text>
                </View>

                {/* Error Banner */}
                {displayError && (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={15} color={colors.accentRed} style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{displayError}</Text>
                  </View>
                )}

                {/* Password Input */}
                <Input
                  label="Password"
                  placeholder="••••••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (validationError) setValidationError(null);
                    if (authError) clearError();
                  }}
                  secureTextEntry={!showPassword}
                  autoFocus
                  leftIcon="Shield"
                  rightIcon={showPassword ? 'EyeOff' : 'Eye'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  hint="At least 6 characters with mixed characters recommended"
                />
              </View>

              {/* Bottom Actions */}
              <View style={styles.bottomSection}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isPasswordValid && !isLoading
                      ? styles.submitButtonActive
                      : styles.submitButtonDisabled,
                  ]}
                  onPress={handleCreateAccount}
                  disabled={!isPasswordValid || isLoading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Create Account & Continue"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text
                      style={[
                        styles.submitButtonText,
                        isPasswordValid ? styles.submitButtonTextActive : styles.submitButtonTextDisabled,
                      ]}
                    >
                      Create Account & Continue
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Switch to Login if already registered */}
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Already have a password? </Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(auth)/login',
                        params: { email: cleanEmail },
                      })
                    }
                  >
                    <Text style={styles.switchLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    height: 48,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    borderRadius: radii.full,
  },
  keyboardContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'web' ? spacing.xxxl : spacing.xl,
    justifyContent: 'space-between',
  },
  topSection: {
    width: '100%',
    paddingTop: spacing.sm,
  },
  title: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emailBadge: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  emailBadgeLabel: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  emailBadgeValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    flex: 1,
    fontSize: 13,
  },
  bottomSection: {
    width: '100%',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  submitButton: {
    width: '100%',
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          transition: 'all 0.15s ease',
        }
      : {}),
  },
  submitButtonActive: {
    backgroundColor: colors.black,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray100,
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any } : {}),
  },
  submitButtonText: {
    ...typography.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButtonTextActive: {
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.gray400,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  switchLink: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
