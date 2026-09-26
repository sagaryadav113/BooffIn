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
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';

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
            <BooffinLogo size={88} />
          </View>

          <Text style={styles.title}>
            Let's <Text style={styles.titleBold}>BooffIn</Text>
          </Text>

          <Text style={styles.tagline}>Research finds its people.</Text>

          <View style={styles.statementBox}>
            <Text style={styles.statementText}>Ideas · Papers · People · Progress</Text>
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
    ...typography.bodyLargeMedium,
    fontSize: 16.5,
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
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.4,
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
    ...typography.caption,
    color: colors.accentRed,
    textAlign: 'center',
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
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
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
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
    ...typography.bodyBold,
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
    ...typography.metadata,
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  legalLink: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
