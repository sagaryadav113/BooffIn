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
import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { GoogleIcon } from '../../components/core/GoogleIcon';
import { useAuthStore } from '../../store/useAuthStore';

const WELCOME_HERO_BG = require('../../../assets/images/welcome-hero.jpg');

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
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#EDEAE4" />
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
  outerContainer: {
    flex: 1,
    backgroundColor: '#EDEAE4',
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: layout.buttonHeights.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: radii.md,
    gap: spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: radii.md,
    gap: spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    paddingTop: spacing.xs + 2,
    alignItems: 'center',
  },
  legalText: {
    ...typography.metadata,
    color: '#6B6862',
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  legalLink: {
    color: '#2A2927',
    textDecorationLine: 'underline',
  },
});
