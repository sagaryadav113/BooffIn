import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Lock, ArrowLeft, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../api/client';
import { colors, radii, spacing, typography } from '../../theme';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { BooffinLogo } from '../../components/core/BooffinLogo';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
    access_token?: string;
    refresh_token?: string;
    type?: string;
  }>();

  useEffect(() => {
    let isMounted = true;

    async function initRecoverySession() {
      try {
        let code = params.code as string | undefined;
        let accessToken = params.access_token as string | undefined;
        let refreshToken = params.refresh_token as string | undefined;
        let errorDesc = (params.error_description || params.error) as string | undefined;

        // On Web: extract from hash if Supabase placed tokens in fragment
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            
            const webError =
              urlParams.get('error_description') ||
              urlParams.get('error') ||
              hashParams.get('error_description') ||
              hashParams.get('error');
            if (webError) errorDesc = webError;

            const webCode = urlParams.get('code');
            if (webCode) code = webCode;

            const webAccess = hashParams.get('access_token');
            if (webAccess) accessToken = webAccess;

            const webRefresh = hashParams.get('refresh_token');
            if (webRefresh) refreshToken = webRefresh;
          } catch {}
        }

        if (errorDesc) {
          if (isMounted) {
            setError(
              errorDesc.includes('expired')
                ? 'This password reset link has expired. Please request a new one.'
                : decodeURIComponent(errorDesc)
            );
            setIsVerifyingSession(false);
          }
          return;
        }

        // Exchange code if PKCE recovery code was provided
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError && isMounted) {
            console.warn('exchangeCodeForSession warning:', exchangeError.message);
          }
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        // Verify active session exists
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session && isMounted) {
          // If no active session, link may be expired or already used
          setError('Invalid or expired password reset session. Please request a fresh reset link.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to verify password reset session.');
        }
      } finally {
        if (isMounted) {
          setIsVerifyingSession(false);
        }
      }
    }

    initRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdatePassword = async () => {
    setError(null);

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setIsSuccess(true);
      setIsLoading(false);

      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to update password.');
    }
  };

  if (isVerifyingSession) {
    return (
      <View style={styles.loadingContainer}>
        <BooffinLogo size={56} style={{ marginBottom: spacing.lg }} />
        <ActivityIndicator size="small" color={colors.textPrimary} />
        <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          Verifying security token...
        </Typography>
      </View>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <BooffinLogo size={48} />
        </View>

        {!isSuccess ? (
          <>
            <Typography variant="h1" style={styles.title}>
              Create New Password
            </Typography>

            <Typography
              variant="body"
              color={colors.textSecondary}
              style={styles.subtitle}
            >
              Choose a secure password for your BooffIn research account.
            </Typography>

            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.accentRed} style={{ marginRight: 8 }} />
                <Typography variant="caption" color={colors.accentRed} style={{ flex: 1 }}>
                  {error}
                </Typography>
              </View>
            )}

            {!error?.includes('expired') && !error?.includes('Invalid') ? (
              <View style={styles.form}>
                <Input
                  label="New Password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    if (error) setError(null);
                  }}
                  secureTextEntry
                  leftIcon="Lock"
                />

                <Input
                  label="Confirm New Password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (error) setError(null);
                  }}
                  secureTextEntry
                  leftIcon="Lock"
                  style={{ marginTop: spacing.md }}
                />

                <Button
                  title={isLoading ? 'Updating Password...' : 'Save New Password'}
                  variant="primary"
                  size="lg"
                  onPress={handleUpdatePassword}
                  disabled={isLoading}
                  style={styles.submitButton}
                />
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title="Request New Reset Link"
                  variant="primary"
                  size="lg"
                  onPress={() => router.replace('/(auth)/forgot-password')}
                  style={styles.submitButton}
                />
              </View>
            )}

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
              Password Updated!
            </Typography>

            <Typography
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.successSubtitle}
            >
              Your BooffIn password has been successfully updated. Redirecting you to sign in...
            </Typography>

            <Button
              title="Sign In Now"
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    padding: spacing.xl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logoRow: {
    marginBottom: spacing.xl,
    alignItems: 'flex-start',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: spacing.lg,
    width: '100%',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
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
