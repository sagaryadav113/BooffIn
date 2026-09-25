import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { QuickOAuthModal } from '../../components/modals/QuickOAuthModal';
import { useAuthStore } from '../../store/useAuthStore';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [handle, setHandle] = useState('');
  const [academicTitle, setAcademicTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [oauthModalVisible, setOauthModalVisible] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'orcid'>('google');

  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const handleSignUp = async () => {
    setValidationError(null);
    clearError();

    if (!fullName.trim()) {
      setValidationError('Please enter your full name.');
      return;
    }

    if (!handle.trim()) {
      setValidationError('Please enter a username or handle.');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    const success = await signUp({
      email: cleanEmail,
      password,
      fullName: fullName.trim(),
      handle: handle.trim().replace(/^@/, ''),
      academicTitle: academicTitle.trim() || 'Research Enthusiast',
      institution: institution.trim() || 'Independent Researcher',
    });

    if (success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      router.replace('/(auth)/onboarding');
    }
  };

  const handleGoogleSignUp = () => {
    setOauthProvider('google');
    setOauthModalVisible(true);
  };

  const handleORCIDSignUp = () => {
    setOauthProvider('orcid');
    setOauthModalVisible(true);
  };

  const handleAuthSuccess = () => {
    setOauthModalVisible(false);
    router.replace('/(auth)/onboarding');
  };

  const displayError = validationError || authError;

  return (
    <ScreenContainer scrollable>
      <Header showBack onBack={() => router.back()} />

      <View style={styles.content}>
        <Typography variant="h1" style={styles.title}>
          Create your BooffIn account
        </Typography>

        <Typography variant="body" color={colors.textSecondary} style={styles.subtitle}>
          Join a community of scientists, students, and research enthusiasts discussing peer-reviewed literature.
        </Typography>

        {/* OAuth Buttons Group */}
        <View style={styles.oauthButtonGroup}>
          {/* Google Sign-up Option */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignUp}
            activeOpacity={0.88}
            disabled={isLoading}
          >
            <View style={styles.googleIconBadge}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Sign Up with Google</Text>
          </TouchableOpacity>

          {/* ORCID Sign-up Option */}
          <TouchableOpacity
            style={styles.orcidButton}
            onPress={handleORCIDSignUp}
            activeOpacity={0.88}
            disabled={isLoading}
          >
            <View style={styles.orcidLogoCircle}>
              <Text style={styles.orcidLogoText}>iD</Text>
            </View>
            <Text style={styles.orcidButtonText}>Sign Up with ORCID iD</Text>
            <CheckCircle2 size={16} color={colors.white} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Typography variant="micro" color={colors.textMuted} style={styles.dividerText}>
            OR REGISTER WITH EMAIL
          </Typography>
          <View style={styles.dividerLine} />
        </View>

        {/* Error Banner */}
        {displayError && (
          <View style={styles.errorBanner}>
            <Typography variant="caption" color={colors.accentRed}>
              {displayError}
            </Typography>
          </View>
        )}

        <View style={styles.form}>
          <Input
            label="Full Name *"
            placeholder="Dr. Elena Park or Maya Singh"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (validationError) setValidationError(null);
            }}
            leftIcon="User"
          />

          <Input
            label="Researcher Handle *"
            placeholder="elenapark"
            value={handle}
            onChangeText={(text) => {
              setHandle(text);
              if (validationError) setValidationError(null);
            }}
            autoCapitalize="none"
            leftIcon="Tag"
          />

          <Input
            label="Academic Role / Status (Optional)"
            placeholder="e.g. Neuroscience Student, Postdoc, PI"
            value={academicTitle}
            onChangeText={setAcademicTitle}
            leftIcon="Shield"
            hint="Students and independent researchers are first-class participants."
          />

          <Input
            label="Institution / University (Optional)"
            placeholder="e.g. Stanford University / Independent"
            value={institution}
            onChangeText={setInstitution}
            leftIcon="Inbox"
          />

          <Input
            label="Academic or Work Email *"
            placeholder="elena@university.edu"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (validationError) setValidationError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon="Mail"
          />

          <Input
            label="Password *"
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (validationError) setValidationError(null);
            }}
            secureTextEntry={!showPassword}
            leftIcon="Lock"
            rightIcon={showPassword ? 'EyeOff' : 'Eye'}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <Button
            title={isLoading ? 'Creating Account...' : 'Create Account with Email'}
            variant="primary"
            size="lg"
            onPress={handleSignUp}
            disabled={isLoading}
            style={styles.signUpButton}
          />
        </View>

        <View style={styles.footerRow}>
          <Typography variant="caption" color={colors.textSecondary}>
            Already have an account?{' '}
          </Typography>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Typography variant="captionBold" color={colors.textPrimary}>
              Sign In
            </Typography>
          </TouchableOpacity>
        </View>

        <QuickOAuthModal
          visible={oauthModalVisible}
          provider={oauthProvider}
          onClose={() => setOauthModalVisible(false)}
          onSuccess={handleAuthSuccess}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  title: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  oauthButtonGroup: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  googleIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
  },
  googleButtonText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  orcidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A6CE39', // Official ORCID Green
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  orcidLogoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidLogoText: {
    color: '#A6CE39',
    fontWeight: '900',
    fontSize: 11,
  },
  orcidButtonText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  form: {
    marginBottom: spacing.xl,
  },
  signUpButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
