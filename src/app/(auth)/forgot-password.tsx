import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { useAuthStore } from '../../store/useAuthStore';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetPassword = useAuthStore((s) => s.resetPassword);

  const handleReset = async () => {
    setError(null);
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(cleanEmail);
    setIsLoading(false);

    if (res.success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setIsSubmitted(true);
    } else {
      setError(res.error || 'Failed to send reset link.');
    }
  };

  return (
    <ScreenContainer scrollable>
      <Header showBack onBack={() => router.back()} />

      <View style={styles.content}>
        {!isSubmitted ? (
          <>
            <Typography variant="h1" style={styles.title}>
              Reset Password
            </Typography>

            <Typography
              variant="body"
              color={colors.textSecondary}
              style={styles.subtitle}
            >
              Enter the email address associated with your BooffIn account and we will send you a secure link to reset your password.
            </Typography>

            {error && (
              <View style={styles.errorBanner}>
                <Typography variant="caption" color={colors.accentRed}>
                  {error}
                </Typography>
              </View>
            )}

            <View style={styles.form}>
              <Input
                label="Academic or Work Email"
                placeholder="scientist@university.edu"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon="Mail"
                error={error || undefined}
              />

              <Button
                title={isLoading ? 'Sending Link...' : 'Send Reset Link'}
                variant="primary"
                size="lg"
                onPress={handleReset}
                disabled={isLoading}
                style={styles.submitButton}
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.backRow}
              activeOpacity={0.7}
            >
              <ArrowLeft size={14} color={colors.textSecondary} />
              <Typography variant="captionMedium" color={colors.textSecondary}>
                Back to Sign In
              </Typography>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.iconCircle}>
              <CheckCircle2 size={36} color={colors.accentGreen} />
            </View>

            <Typography variant="h2" align="center" style={styles.successTitle}>
              Check Your Inbox
            </Typography>

            <Typography
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.successSubtitle}
            >
              We have sent a password reset link to{' '}
              <Typography variant="body" style={{ fontWeight: '700' }}>
                {email}
              </Typography>
              . Click the link in the email to choose a new password.
            </Typography>

            <Button
              title="Return to Sign In"
              variant="primary"
              size="lg"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.returnButton}
            />
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    lineHeight: 22,
    marginBottom: spacing.xxl,
    maxWidth: 340,
  },
  returnButton: {
    width: '100%',
  },
});
