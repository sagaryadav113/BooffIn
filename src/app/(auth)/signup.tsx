import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle, ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { checkEmailExists, isProfileComplete, validatePassword } from '../../api/authService';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { Input } from '../../components/core/Input';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, radii, spacing } from '../../theme';

export default function SignupScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const cleanEmail = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Live Password Rules Checklist
  const passwordRules = useMemo(() => [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      id: 'letter',
      label: 'Contains a letter (a-z, A-Z)',
      met: /[a-zA-Z]/.test(password),
    },
    {
      id: 'number',
      label: 'Contains a number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'Contains a special character (!@#$%^&*)',
      met: /[^a-zA-Z0-9\s]/.test(password),
    },
  ], [password]);

  const passwordValidation = validatePassword(password);
  const isPasswordValid = passwordValidation.isValid;

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    router.back();
  };

  const handleGoogleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
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

  const handleGoToLogin = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    router.push({
      pathname: '/(auth)/login',
      params: { email: cleanEmail || undefined },
    });
  };

  const handleCreateAccount = async () => {
    setValidationError(null);
    setIsExistingAccount(false);
    clearError();

    if (!isEmailValid) {
      setValidationError('Please enter a valid academic or personal email address.');
      return;
    }

    if (!agreedToTerms) {
      setValidationError('You must agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }

    if (!isPasswordValid) {
      setValidationError(passwordValidation.error || 'Password must be at least 6 characters.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { }

    // 1. Pre-flight check: Is this email already registered?
    try {
      const alreadyExists = await checkEmailExists(cleanEmail);
      if (alreadyExists) {
        setIsExistingAccount(true);
        setValidationError('An account with this email already exists. Please sign in instead.');
        return;
      }
    } catch { }

    // 2. Create the account with Email and Password
    const success = await signUp({
      email: cleanEmail,
      password,
    });

    if (success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch { }

      // Immediately launch the 5-Step Profile Onboarding Flow!
      router.replace('/(auth)/onboarding');
    } else {
      const currentErr = useAuthStore.getState().authError || '';
      if (
        currentErr.toLowerCase().includes('already registered') ||
        currentErr.toLowerCase().includes('already in use') ||
        currentErr.toLowerCase().includes('user already exists')
      ) {
        setIsExistingAccount(true);
        setValidationError('An account with this email already exists. Please sign in instead.');
      } else {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch { }
      }
    }
  };

  const displayError = validationError || authError;
  const isFormValid = isEmailValid && isPasswordValid && agreedToTerms && !isLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
            <View style={styles.topSection}>
              {/* Vector Crest Logo */}
              <View style={styles.logoRow}>
                <BooffinLogo size={52} variant="symbol" />
              </View>

              <Text style={styles.title}>Create your account</Text>

              {/* Sign In link */}
              <View style={styles.subHeaderRow}>
                <Text style={styles.subtitleText}>Already have an account? </Text>
                <TouchableOpacity onPress={handleGoToLogin}>
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
                  <View style={styles.errorHeaderRow}>
                    <AlertCircle size={16} color={colors.accentRed} style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.errorText}>{displayError}</Text>
                    </View>
                  </View>

                  {/* Direct Action Pill if account already exists */}
                  {isExistingAccount && (
                    <TouchableOpacity
                      style={styles.signInActionBtn}
                      onPress={handleGoToLogin}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.signInActionBtnText}>Log In with Password</Text>
                      <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.2} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Hidden autofill shield on web to intercept browser credential autofill */}
              {Platform.OS === 'web' && (
                <View style={styles.autofillShield} pointerEvents="none" aria-hidden={true}>
                  <TextInput style={styles.autofillDummy} tabIndex={-1} autoComplete="off" />
                  <TextInput secureTextEntry style={styles.autofillDummy} tabIndex={-1} autoComplete="new-password" />
                </View>
              )}

              {/* Email Input */}
              <Input
                label="Email address"
                placeholder="scientist@university.edu"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setIsExistingAccount(false);
                  if (validationError) setValidationError(null);
                  if (authError) clearError();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                containerStyle={styles.inputContainer}
              />

              {/* Password Input */}
              <Input
                label="Create BooffIn Password"
                placeholder="Enter a secure password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (validationError) setValidationError(null);
                  if (authError) clearError();
                }}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'EyeOff' : 'Eye'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                hint="Create a new password for your BooffIn account."
                containerStyle={styles.inputContainer}
              />

              {/* Live Password Checklist Rule */}
              <View style={styles.passwordRulesCard}>
                <View style={styles.rulesHeaderRow}>
                  <Text style={styles.rulesHeaderTitle}>Password requirements:</Text>
                  {isPasswordValid && (
                    <View style={styles.rulesAllMetBadge}>
                      <Check size={11} color="#059669" strokeWidth={3} />
                      <Text style={styles.rulesAllMetText}>All requirements met</Text>
                    </View>
                  )}
                </View>
                <View style={styles.rulesList}>
                  {passwordRules.map((rule) => (
                    <View key={rule.id} style={styles.ruleRow}>
                      <View
                        style={[
                          styles.ruleIndicator,
                          rule.met ? styles.ruleIndicatorMet : styles.ruleIndicatorUnmet,
                        ]}
                      >
                        {rule.met ? (
                          <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
                        ) : (
                          <View style={styles.ruleUnmetDot} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.ruleText,
                          rule.met ? styles.ruleTextMet : styles.ruleTextUnmet,
                        ]}
                      >
                        {rule.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

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
                  isFormValid ? styles.submitButtonActive : styles.submitButtonDisabled,
                ]}
                onPress={handleCreateAccount}
                disabled={!isFormValid}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Create Account"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      isFormValid
                        ? styles.submitButtonTextActive
                        : styles.submitButtonTextDisabled,
                    ]}
                  >
                    Create Account & Continue
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.footnote}>
                Next, you&apos;ll configure your academic profile across a brief 5-step onboarding flow.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
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
  inputContainer: {
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '500',
  },
  signInActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    marginTop: 10,
    gap: 6,
    alignSelf: 'flex-start',
  },
  signInActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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
  bottomSection: {
    width: '100%',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  submitButton: {
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonActive: {
    backgroundColor: '#064E3B',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  submitButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#9CA3AF',
  },
  footnote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
  passwordRulesCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  rulesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rulesHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rulesAllMetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rulesAllMetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  rulesList: {
    gap: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  ruleIndicatorMet: {
    backgroundColor: '#059669',
  },
  ruleIndicatorUnmet: {
    backgroundColor: '#E2E8F0',
  },
  ruleUnmetDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  ruleText: {
    fontSize: 12,
  },
  ruleTextMet: {
    color: '#0F172A',
    fontWeight: '500',
  },
  ruleTextUnmet: {
    color: '#64748B',
  },
  autofillShield: {
    height: 0,
    width: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
  },
  autofillDummy: {
    height: 0,
    width: 0,
    opacity: 0,
  },
});
