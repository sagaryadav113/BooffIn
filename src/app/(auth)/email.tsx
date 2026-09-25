import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';

export default function EmailAuthScreen() {
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.replace('/(auth)/welcome');
  };

  const handleContinue = async () => {
    if (!isValidEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage(null);
    setIsChecking(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    // Navigate to progressive password screen with pre-filled email
    setTimeout(() => {
      setIsChecking(false);
      router.push({
        pathname: '/(auth)/login',
        params: { email: cleanEmail },
      });
    }, 150);
  };

  const handleLoginWithPassword = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    router.push({
      pathname: '/(auth)/login',
      params: { email: cleanEmail || undefined },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.wrapper}>
          {/* Header with Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back to welcome"
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
              {/* Top Title & Input Section */}
              <View style={styles.topSection}>
                <Text style={styles.title}>What's your email?</Text>

                {/* Email Input Field */}
                <View
                  style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    errorMessage && styles.inputContainerError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Email address"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (isValidEmail) handleContinue();
                    }}
                  />

                  {isValidEmail && (
                    <View style={styles.validCheck}>
                      <Check size={16} color={colors.accentGreen} strokeWidth={2.5} />
                    </View>
                  )}
                </View>

                {/* Error message or Supporting text */}
                {errorMessage ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={14} color={colors.accentRed} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : (
                  <Text style={styles.supportingText}>
                    We'll use this to sign you in or set up your researcher account on BooffIn.
                  </Text>
                )}
              </View>

              {/* Bottom Action Stack */}
              <View style={styles.bottomSection}>
                {/* Primary Continue Button */}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    isValidEmail ? styles.continueButtonActive : styles.continueButtonDisabled,
                  ]}
                  onPress={handleContinue}
                  disabled={!isValidEmail || isChecking}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with email"
                >
                  {isChecking ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text
                      style={[
                        styles.continueButtonText,
                        isValidEmail ? styles.continueButtonTextActive : styles.continueButtonTextDisabled,
                      ]}
                    >
                      Continue
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Secondary Option: Log in with password */}
                <TouchableOpacity
                  style={styles.passwordOptionButton}
                  onPress={handleLoginWithPassword}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Log in with password"
                >
                  <Text style={styles.passwordOptionText}>Log in with password</Text>
                </TouchableOpacity>
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
    fontSize: 34,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    borderRadius: radii.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  inputContainerFocused: {
    borderColor: colors.textPrimary,
  },
  inputContainerError: {
    borderColor: colors.accentRed,
  },
  input: {
    flex: 1,
    height: '100%',
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  validCheck: {
    marginLeft: spacing.xs,
  },
  supportingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm + 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    fontSize: 13,
  },
  bottomSection: {
    width: '100%',
    gap: spacing.sm + 2,
    paddingTop: spacing.xl,
  },
  continueButton: {
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
  continueButtonActive: {
    backgroundColor: colors.black,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  continueButtonDisabled: {
    backgroundColor: colors.gray100,
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any } : {}),
  },
  continueButtonText: {
    ...typography.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
  },
  continueButtonTextActive: {
    color: colors.white,
  },
  continueButtonTextDisabled: {
    color: colors.gray400,
  },
  passwordOptionButton: {
    width: '100%',
    height: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer' as any,
          transition: 'all 0.15s ease',
        }
      : {}),
  },
  passwordOptionText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
