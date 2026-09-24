import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../api/client';
import { fetchUserProfile, setStoredLocalSession } from '../../api/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { colors, spacing, typography, radii } from '../../theme';
import { currentUser } from '../../data/mockData';
import { UserProfile } from '../../types';

export default function AuthCallbackScreen() {
  const [statusText, setStatusText] = useState('Completing authentication...');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const errorDesc =
            urlParams.get('error_description') ||
            urlParams.get('error') ||
            new URLSearchParams(window.location.hash.substring(1)).get('error_description');

          if (errorDesc) {
            if (isMounted) {
              setErrorText(decodeURIComponent(errorDesc));
            }
            setTimeout(() => {
              router.replace('/(auth)/welcome');
            }, 3500);
            return;
          }

          // In PKCE flow: if code is present in query parameters, exchange for session
          const code = urlParams.get('code');
          if (code) {
            if (isMounted) setStatusText('Exchanging authorization code...');
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.warn('exchangeCodeForSession warning:', exchangeError.message);
            }
          }
        }

        // Wait a short tick for detectSessionInUrl to complete hash/token parsing
        await new Promise((resolve) => setTimeout(resolve, 400));

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          // Retry once more
          await new Promise((resolve) => setTimeout(resolve, 600));
          const retry = await supabase.auth.getSession();
          if (!retry.data.session?.user) {
            if (isMounted) {
              setErrorText('Could not find active authentication session. Redirecting to welcome...');
            }
            setTimeout(() => router.replace('/(auth)/welcome'), 2500);
            return;
          }
        }

        const activeSession = (await supabase.auth.getSession()).data.session;
        if (!activeSession?.user) {
          if (isMounted) {
            setErrorText('Session expired. Redirecting to login...');
          }
          setTimeout(() => router.replace('/(auth)/welcome'), 2000);
          return;
        }

        const user = activeSession.user;
        if (isMounted) setStatusText('Setting up your research profile...');

        // Retrieve existing profile or construct a newly authenticated Google/OAuth profile
        let profile = await fetchUserProfile(user.id);
        if (!profile) {
          const metadata = user.user_metadata || {};
          const fullName =
            metadata.full_name ||
            metadata.name ||
            user.email?.split('@')[0] ||
            'Researcher';
          const rawHandle =
            metadata.user_name ||
            metadata.preferred_username ||
            user.email?.split('@')[0] ||
            'researcher';
          const cleanHandle = rawHandle.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
          const avatarUrl = metadata.avatar_url || metadata.picture;

          const newProfile: UserProfile = {
            ...currentUser,
            id: user.id,
            handle: cleanHandle || 'researcher',
            fullName,
            avatarUrl,
            academicTitle: metadata.academic_title || 'Research Enthusiast',
            institution: metadata.institution || 'Independent Researcher',
            bio: 'Exploring literature, asking questions, and discussing peer-reviewed science on BooffIn.',
            orcidVerified: Boolean(metadata.orcid_id),
            orcidId: metadata.orcid_id,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            savedCount: 0,
            joinedDate: 'Just now',
          };

          try {
            await supabase.from('profiles').upsert({
              id: user.id,
              username: newProfile.handle,
              full_name: fullName,
              avatar_url: avatarUrl,
              academic_title: newProfile.academicTitle,
              institution: newProfile.institution,
            });
          } catch (e) {
            console.warn('Profile sync warning:', e);
          }

          profile = newProfile;
        }

        // Store profile in auth state and local storage
        setStoredLocalSession(profile);
        useAuthStore.setState({
          user: profile,
          authStatus: 'authenticated',
          isAuthenticated: true,
          isLoading: false,
          authError: null,
        });

        // Navigate to home feed
        router.replace('/(tabs)');
      } catch (err: any) {
        console.error('Auth callback error:', err);
        if (isMounted) {
          setErrorText(err.message || 'An unexpected error occurred.');
        }
        setTimeout(() => router.replace('/(auth)/welcome'), 3000);
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <BooffinLogo size={64} style={styles.logo} />

      {errorText ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Authentication Notice</Text>
          <Text style={styles.errorText}>{errorText}</Text>
          <Text style={styles.redirectText}>Redirecting...</Text>
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.textPrimary} style={styles.spinner} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: {
    marginBottom: spacing.xl,
  },
  loadingBox: {
    alignItems: 'center',
  },
  spinner: {
    marginBottom: spacing.md,
  },
  statusText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    maxWidth: 360,
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  redirectText: {
    ...typography.micro,
    color: colors.textMuted,
  },
});
