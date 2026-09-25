import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, LogIn, Download, Smartphone } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { Button } from '../../components/core/Button';
import { InstallAppModal } from '../../components/modals/InstallAppModal';
import { QuickOAuthModal } from '../../components/modals/QuickOAuthModal';
import { useAuthStore } from '../../store/useAuthStore';
import { currentUser } from '../../data/mockData';

export default function WelcomeScreen() {
  const { signInWithDemoUser, isLoading } = useAuthStore();
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [oauthModalVisible, setOauthModalVisible] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'orcid'>('google');

  const handleCreateAccount = () => {
    router.push('/(auth)/signup');
  };

  const handleSignIn = () => {
    router.push('/(auth)/login');
  };

  const handleGoogleAuth = () => {
    setOauthProvider('google');
    setOauthModalVisible(true);
  };

  const handleOrcidAuth = () => {
    setOauthProvider('orcid');
    setOauthModalVisible(true);
  };

  const handleAuthSuccess = () => {
    setOauthModalVisible(false);
    router.replace('/(tabs)');
  };

  const handleGuestDemo = () => {
    signInWithDemoUser(currentUser);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        {/* Top Spacer */}
        <View style={styles.topSection} />

        {/* Center Hero with Official Logo & Tagline */}
        <View style={styles.heroSection}>
          <BooffinLogo size={120} style={styles.logo} />

          <Text style={styles.brandTitle}>
            Let's <Text style={{ fontWeight: '800' }}>BooffIn</Text>
          </Text>
          <Text style={styles.tagline}>Research finds it's people.</Text>

          <View style={styles.statementWrapper}>
            <Text style={styles.statementText}>Ideas. Papers. People. Progress.</Text>
            <Text style={styles.subStatement}>A modern scientific community, in your pocket.</Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomSection}>
          {/* Google Authentication Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleAuth}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            <View style={styles.buttonContent}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          {/* ORCID iD Authentication Button */}
          <TouchableOpacity
            style={styles.orcidButton}
            onPress={handleOrcidAuth}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            <View style={styles.buttonContent}>
              <View style={styles.orcidBadge}>
                <Text style={styles.orcidBadgeText}>iD</Text>
              </View>
              <Text style={styles.orcidButtonText}>Continue with ORCID</Text>
            </View>
          </TouchableOpacity>

          {/* Primary Create Account Button */}
          <Button
            title="Create Account with Email"
            variant="primary"
            size="lg"
            onPress={handleCreateAccount}
            iconRight={<ArrowRight size={18} color={colors.white} style={{ marginLeft: spacing.xs }} />}
            style={styles.actionButton}
          />

          {/* Secondary Sign In Button */}
          <Button
            title="Sign In to Existing Account"
            variant="secondary"
            size="lg"
            onPress={handleSignIn}
            iconLeft={<LogIn size={18} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />}
            style={styles.actionButton}
          />

          {/* Install App Trigger Button */}
          <TouchableOpacity
            style={styles.installAppLink}
            onPress={() => setInstallModalVisible(true)}
            activeOpacity={0.8}
          >
            <Download size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.installAppLinkText}>Install App for Web & Mobile</Text>
          </TouchableOpacity>

          {/* Guest / Demo Explore Option */}
          <TouchableOpacity
            onPress={handleGuestDemo}
            activeOpacity={0.7}
            style={styles.guestLink}
          >
            <Text style={styles.guestLinkText}>
              Explore as Guest / Offline Demo →
            </Text>
          </TouchableOpacity>
        </View>

        <InstallAppModal
          visible={installModalVisible}
          onClose={() => setInstallModalVisible(false)}
        />

        <QuickOAuthModal
          visible={oauthModalVisible}
          provider={oauthProvider}
          onClose={() => setOauthModalVisible(false)}
          onSuccess={handleAuthSuccess}
        />
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
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  topSection: {
    height: 10,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    marginBottom: spacing.xs,
  },
  brandTitle: {
    ...typography.h1,
    fontSize: 30,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 2,
  },
  tagline: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 14,
    letterSpacing: 0.1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statementWrapper: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  statementText: {
    ...typography.h3,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  subStatement: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs + 4,
  },
  googleButton: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadge: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  orcidButton: {
    width: '100%',
    backgroundColor: '#A6CE39',
    borderRadius: radii.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orcidBadge: {
    backgroundColor: colors.white,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidBadgeText: {
    color: '#A6CE39',
    fontWeight: '900',
    fontSize: 11,
  },
  orcidButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  actionButton: {
    width: '100%',
    paddingVertical: spacing.md - 2,
  },
  installAppLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 2,
  },
  installAppLinkText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  guestLink: {
    paddingVertical: spacing.xs,
    marginTop: 2,
  },
  guestLinkText: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
