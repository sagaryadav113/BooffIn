import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Input } from '../../components/core/Input';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';
import { validatePassword, isProfileComplete } from '../../api/authService';

const BOOFFIN_LOGO = require('../../../assets/images/booffin-symbol.png');

export default function SignupScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const cleanEmail = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const passwordValidation = validatePassword(password);
  const isPasswordValid = passwordValidation.isValid;

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.back();
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

  const handleCreateAccount = async () => {
    setValidationError(null);
    clearError();

    if (!isEmailValid) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (!agreedToTerms) {
      setValidationError('You must agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }

    const pwdVal = validatePassword(password);
    if (!pwdVal.isValid) {
      setValidationError(pwdVal.error || 'Password must be at least 6 characters.');
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
      router.replace('/(auth)/onboarding');
    }
  };

  const isAlreadyRegistered =
    authError?.toLowerCase().includes('already registered') ||
    authError?.toLowerCase().includes('already in use') ||
    authError?.toLowerCase().includes('user already exists');

  const displayError = validationError || authError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Form Section */}
              <View style={styles.topSection}>
                {/* Logo Mark */}
                <View style={styles.logoRow}>
                  <View style={styles.logoContainer}>
                    <Image source={BOOFFIN_LOGO} style={styles.logoImage} resizeMode="contain" />
                  </View>
                </View>

                <Text style={styles.title}>Create your account</Text>
                
                {/* Sign In link */}
                <View style={styles.subHeaderRow}>
                  <Text style={styles.subtitleText}>Already have an account? </Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(auth)/login',
                        params: { email: cleanEmail || undefined },
                      })
                    }
                  >
                    <Text style={styles.signInLink}>Sign in</Text>
                  </TouchableOpacity>
                </View>

                {/* Google Single Sign-On Button */}
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                >
                  <GoogleIcon size={18} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with email</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Error Banner */}
                {displayError && (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={15} color={colors.accentRed} style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.errorText}>{displayError}</Text>
                      {isAlreadyRegistered && (
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: '/(auth)/login',
                              params: { email: cleanEmail },
                            })
                          }
                          style={{ marginTop: 4 }}
                        >
                          <Text style={styles.errorActionLink}>Click here to Sign In →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Email Input */}
                <Input
                  label="Email address"
                  placeholder="scientist@university.edu"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (validationError) setValidationError(null);
                    if (authError) clearError();
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={!email}
                />

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
                  autoFocus={!!email}
                  rightIcon={showPassword ? 'EyeOff' : 'Eye'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  hint="At least 6 characters with letters and numbers"
                />

                {/* Agreement Checkbox (Reference 1) */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.8}
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      agreedToTerms && styles.checkboxBoxChecked,
                    ]}
                  >
                    {agreedToTerms && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    By creating an account, I agree to BooffIn's{' '}
                    <Text
                      style={styles.legalLink}
                      onPress={() => router.push('/welcome/terms' as any)}
                    >
                      Terms of Use
                    </Text>
                    , and acknowledge its{' '}
                    <Text
                      style={styles.legalLink}
                      onPress={() => router.push('/welcome/policy' as any)}
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Actions */}
              <View style={styles.bottomSection}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isEmailValid && isPasswordValid && agreedToTerms && !isLoading
                      ? styles.submitButtonActive
                      : styles.submitButtonDisabled,
                  ]}
                  onPress={handleCreateAccount}
                  disabled={!isEmailValid || !isPasswordValid || !agreedToTerms || isLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.submitButtonText,
                        isEmailValid && isPasswordValid && agreedToTerms
                          ? styles.submitButtonTextActive
                          : styles.submitButtonTextDisabled,
                      ]}
                    >
                      Continue
                    </Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.footnote}>
                  BooffIn is an open scholarly network for researchers, students, and institutions.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  wrapper: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'web' ? spacing.xxxl : spacing.xl,
    justifyContent: 'space-between',
  },
  topSection: {
    width: '100%',
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  title: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 28,
    color: '#111827',
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signInLink: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
  },
  legalLink: {
    color: '#F97316',
    textDecorationLine: 'underline',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  errorActionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textDecorationLine: 'underline',
  },
  bottomSection: {
    width: '100%',
    paddingTop: spacing.lg,
  },
  submitButton: {
    width: '100%',
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  submitButtonActive: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#9CA3AF',
  },
  footnote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
