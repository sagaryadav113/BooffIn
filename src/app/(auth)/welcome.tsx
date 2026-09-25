import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { useAuthStore } from '../../store/useAuthStore';

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

export default function WelcomeScreen() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);

  const handleGoogleAuth = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const success = await signInWithGoogle();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleEmailAuth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push('/(auth)/email');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        {/* Top Spacer for generous vertical breathing room */}
        <View style={styles.topSpacer} />

        {/* Central Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <BooffinLogo size={108} />
          </View>

          <Text style={styles.title}>
            Let's <Text style={styles.titleBold}>BooffIn</Text>
          </Text>

          <Text style={styles.tagline}>Research finds it's people.</Text>

          <View style={styles.statementBox}>
            <Text style={styles.statementText}>Ideas. Papers. People. Progress.</Text>
          </View>
        </View>

        {/* Bottom Actions Section */}
        <View style={styles.bottomSection}>
          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          {/* Continue with Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleAuth}
            disabled={isLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <GoogleIcon size={20} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Continue with Email */}
          <TouchableOpacity
            style={styles.emailButton}
            onPress={handleEmailAuth}
            disabled={isLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continue with email"
          >
            <Mail size={19} color={colors.textPrimary} strokeWidth={2} />
            <Text style={styles.emailButtonText}>Continue with email</Text>
          </TouchableOpacity>

          {/* Legal Footer */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By continuing, you agree to BooffIn's{' '}
              <Text style={styles.legalLink}>Terms of Use</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: Platform.OS === 'web' ? spacing.xxxl : spacing.lg,
    paddingBottom: Platform.OS === 'web' ? spacing.xxxl : spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  topSpacer: {
    height: Platform.OS === 'web' ? 24 : 16,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: spacing.xl,
  },
  logoWrapper: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    marginBottom: 8,
  },
  titleBold: {
    fontWeight: '800',
  },
  tagline: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.1,
    marginBottom: spacing.lg,
  },
  statementBox: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  statementText: {
    ...typography.captionMedium,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.xs,
    width: '100%',
  },
  errorText: {
    ...typography.micro,
    color: colors.accentRed,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radii.md,
    gap: spacing.sm + 2,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer' as any,
          transition: 'all 0.15s ease',
        }
      : {}),
  },
  googleButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radii.md,
    gap: spacing.sm + 2,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer' as any,
          transition: 'all 0.15s ease',
        }
      : {}),
  },
  emailButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  legalContainer: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  legalText: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  legalLink: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
