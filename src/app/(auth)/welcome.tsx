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
  ImageBackground,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Mail, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const WELCOME_HERO_BG = require('../../../assets/images/welcome-hero.jpg');

export default function WelcomeScreen() {
  const { isDesktop } = useResponsiveLayout();
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

  const handleSignUp = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push('/(auth)/signup');
  };

  // 1. Desktop 2-Column Professional Split Layout
  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 1260,
            width: '100%',
            margin: '0 auto',
            padding: '24px 28px',
            minHeight: 'calc(100vh - 68px)',
            boxSizing: 'border-box',
            gap: 56,
          }}
        >
          {/* Left Column: Welcome Graphic & Branding */}
          <div
            style={{
              flex: 1.35,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              maxWidth: 720,
              width: '100%',
              overflow: 'hidden',
              borderRadius: 24,
            }}
          >
            <Image
              source={WELCOME_HERO_BG}
              style={{
                width: '100%',
                maxWidth: 660,
                height: 720,
                maxHeight: 760,
                transform: [{ translateY: 130 }, { scale: 1.5 }],
              }}
              contentFit="contain"
              accessibilityLabel="Welcome to BooffIn - Research finds its people"
            />
          </div>

          {/* Right Column: Clean White Authentication Card (Vertically Center Aligned) */}
          <div
            style={{
              flex: 0.85,
              maxWidth: 420,
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: '38px 32px',
              boxShadow: '0 10px 30px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignSelf: 'center',
              margin: 'auto 0',
            }}
          >
            <Text style={styles.cardHeaderTitle}>Join the community</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Connect with scholars worldwide, share preprints, and participate in academic peer discussions.
            </Text>

            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.authButtonsStack}>
              {/* Sign up for free */}
              <TouchableOpacity
                style={styles.signUpButton}
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Sign up for free"
              >
                <Text style={styles.signUpButtonText}>Sign up for free</Text>
              </TouchableOpacity>

              {/* Continue with Google */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleAuth}
                disabled={isLoading}
                activeOpacity={0.88}
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
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Continue with email"
              >
                <Mail size={19} color={colors.textPrimary} strokeWidth={2} />
                <Text style={styles.emailButtonText}>Continue with email</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.loginDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Already have account */}
            <TouchableOpacity
              style={styles.loginLinkBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
              </Text>
            </TouchableOpacity>

            {/* Legal Footer */}
            <View style={styles.legalContainerDesktop}>
              <Text style={styles.legalText}>
                By continuing, you agree to BooffIn's{' '}
                <Text style={styles.legalLink}>Terms of Use</Text> and{' '}
                <Text style={styles.legalLink}>Privacy Policy</Text>.
              </Text>
            </View>
          </div>
        </div>
      </View>
    );
  }

  // 2. Mobile Responsive Full-screen Hero
  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ImageBackground
        source={WELCOME_HERO_BG}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Artwork Spacer - preserves visibility for the illustration & tagline */}
            <View style={styles.artworkSpacer} />

            {/* Bottom Actions Section */}
            <View style={styles.bottomSection}>
              {authError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}

              {/* Sign up for free */}
              <TouchableOpacity
                style={styles.signUpButton}
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Sign up for free"
              >
                <Text style={styles.signUpButtonText}>Sign up for free</Text>
              </TouchableOpacity>

              {/* Continue with Google */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleAuth}
                disabled={isLoading}
                activeOpacity={0.88}
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
                activeOpacity={0.88}
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
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    width: '100%',
    minHeight: 'calc(100vh - 68px)' as any,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.5,
  },
  desktopSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  desktopDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
    maxWidth: 440,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardHeaderSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  authButtonsStack: {
    gap: 12,
    width: '100%',
  },
  loginDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loginLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  loginLinkText: {
    fontSize: 13.5,
    color: '#475569',
  },
  loginLinkBold: {
    fontWeight: '700',
    color: '#064E3B',
  },
  legalContainerDesktop: {
    marginTop: 20,
    alignItems: 'center',
  },
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: Platform.OS === 'web' ? spacing.xxl : spacing.md,
    paddingBottom: Platform.OS === 'web' ? spacing.xxxl : spacing.xl,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  artworkSpacer: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 440 : 400,
    width: '100%',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingTop: spacing.xs,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.xs,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    textAlign: 'center',
    fontSize: 13,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
    backgroundColor: colors.brandDarkGreen,
    borderRadius: radii.md,
    shadowColor: colors.brandDarkGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonText: {
    ...typography.bodyBold,
    color: colors.white,
    fontSize: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  googleButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  emailButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  legalContainer: {
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  legalText: {
    ...typography.micro,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 11.5,
  },
  legalLink: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
