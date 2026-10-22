import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, AlertCircle, Mail, RotateCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing } from '../../theme';
import { Input } from '../../components/core/Input';
import { OtpInput } from '../../components/core/OtpInput';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { useAuthStore } from '../../store/useAuthStore';
import { isProfileComplete } from '../../api/authService';

export default function SignupScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [stage, setStage] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState(params.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(30);

  const sendOtp = useAuthStore((s) => s.sendOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const cleanEmail = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: any;
    if (stage === 'otp' && resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage, resendCountdown]);

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (stage === 'otp') {
      setStage('email');
      setOtpCode('');
      setValidationError(null);
      clearError();
      return;
    }
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

  const handleSendOtp = async () => {
    setValidationError(null);
    clearError();

    if (!isEmailValid) {
      setValidationError('Please enter a valid academic or personal email address.');
      return;
    }

    if (!agreedToTerms) {
      setValidationError('You must agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const res = await sendOtp(cleanEmail);
    if (res.success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setStage('otp');
      setResendCountdown(30);
    } else {
      setValidationError(res.error || 'Failed to send verification code. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isLoading) return;
    setValidationError(null);
    clearError();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const res = await sendOtp(cleanEmail);
    if (res.success) {
      setResendCountdown(30);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      setValidationError(res.error || 'Failed to resend code.');
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim();
    if (code.length < 6) {
      setValidationError('Please enter the complete 6-digit verification code.');
      return;
    }

    setValidationError(null);
    clearError();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const success = await verifyOtp(cleanEmail, code);
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
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  };

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
              {stage === 'email' ? (
                /* STAGE 1: Email Entry */
                <>
                  <View style={styles.topSection}>
                    {/* Vector Crest Logo */}
                    <View style={styles.logoRow}>
                      <BooffinLogo size={52} variant="symbol" />
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
                      autoComplete="off"
                    />

                    {/* Agreement Checkbox */}
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
                        By creating an account, I agree to BooffIn&apos;s{' '}
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
                        isEmailValid && agreedToTerms && !isLoading
                          ? styles.submitButtonActive
                          : styles.submitButtonDisabled,
                      ]}
                      onPress={handleSendOtp}
                      disabled={!isEmailValid || !agreedToTerms || isLoading}
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
                            isEmailValid && agreedToTerms
                              ? styles.submitButtonTextActive
                              : styles.submitButtonTextDisabled,
                          ]}
                        >
                          Continue
                        </Text>
                      )}
                    </TouchableOpacity>

                    <Text style={styles.footnote}>
                      We will send a 6-digit secure code to verify your email. No password needed.
                    </Text>
                  </View>
                </>
              ) : (
                /* STAGE 2: OTP Verification */
                <>
                  <View style={styles.topSection}>
                    {/* Vector Crest Logo */}
                    <View style={styles.logoRow}>
                      <BooffinLogo size={52} variant="symbol" />
                    </View>

                    <Text style={styles.title}>Check your inbox</Text>

                    <Text style={styles.otpSubtitle}>
                      We&apos;ve sent a 6-digit verification code to
                    </Text>
                    <View style={styles.emailBadgeRow}>
                      <Mail size={15} color="#064E3B" style={{ marginRight: 6 }} />
                      <Text style={styles.emailBadgeText}>{cleanEmail}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setStage('email');
                          setOtpCode('');
                          setValidationError(null);
                        }}
                        style={styles.editEmailButton}
                      >
                        <Text style={styles.editEmailText}>Edit</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Error Banner */}
                    {displayError && (
                      <View style={styles.errorBanner}>
                        <AlertCircle size={15} color={colors.accentRed} style={{ marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.errorText}>{displayError}</Text>
                        </View>
                      </View>
                    )}

                    {/* 6-Digit Discrete OTP Input */}
                    <OtpInput
                      length={6}
                      value={otpCode}
                      onChange={(code) => {
                        setOtpCode(code);
                        if (validationError) setValidationError(null);
                        if (authError) clearError();
                      }}
                      onComplete={(code) => handleVerifyOtp(code)}
                      disabled={isLoading}
                      hasError={Boolean(displayError)}
                    />

                    {/* Resend Code Section */}
                    <View style={styles.resendRow}>
                      {resendCountdown > 0 ? (
                        <Text style={styles.resendCooldownText}>
                          Resend code in <Text style={{ fontWeight: '700' }}>{resendCountdown}s</Text>
                        </Text>
                      ) : (
                        <TouchableOpacity
                          onPress={handleResendOtp}
                          disabled={isLoading}
                          style={styles.resendActiveButton}
                          activeOpacity={0.7}
                        >
                          <RotateCw size={14} color="#064E3B" style={{ marginRight: 6 }} />
                          <Text style={styles.resendActiveText}>Resend code</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Bottom Actions */}
                  <View style={styles.bottomSection}>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        otpCode.length === 6 && !isLoading
                          ? styles.submitButtonActive
                          : styles.submitButtonDisabled,
                      ]}
                      onPress={() => handleVerifyOtp()}
                      disabled={otpCode.length < 6 || isLoading}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityLabel="Verify and continue"
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.submitButtonText,
                            otpCode.length === 6
                              ? styles.submitButtonTextActive
                              : styles.submitButtonTextDisabled,
                          ]}
                        >
                          Verify & Continue
                        </Text>
                      )}
                    </TouchableOpacity>

                    <Text style={styles.footnote}>
                      Didn&apos;t get the email? Check your spam folder or request a new code above.
                    </Text>
                  </View>
                </>
              )}
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
    color: '#064E3B',
    fontWeight: '700',
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
    backgroundColor: '#064E3B',
    borderColor: '#064E3B',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
  },
  legalLink: {
    color: '#064E3B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  emailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#064E3B',
  },
  editEmailButton: {
    marginLeft: spacing.sm,
    paddingLeft: spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: '#BBF7D0',
  },
  editEmailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
    textDecorationLine: 'underline',
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  resendCooldownText: {
    fontSize: 13,
    color: '#6B7280',
  },
  resendActiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: '#F0FDF4',
  },
  resendActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
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
    backgroundColor: '#064E3B',
    shadowColor: '#064E3B',
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
