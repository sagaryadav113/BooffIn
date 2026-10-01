import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../api/client';
import { fetchUserProfile, setStoredLocalSession, getStoredLocalSession, getInitialAuthSession } from '../../api/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { colors, radii, spacing, typography } from '../../theme';
import { UserProfile } from '../../types';

export default function AuthCallbackScreen() {
  const [statusText, setStatusText] = useState('Completing authentication...');
  const [errorText, setErrorText] = useState<string | null>(null);
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    access_token?: string;
    refresh_token?: string;
  }>();

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        let errorDesc: string | undefined = (params.error_description || params.error) as string | undefined;
        let code: string | undefined = params.code as string | undefined;
        let accessToken: string | undefined = params.access_token as string | undefined;
        let refreshToken: string | undefined = params.refresh_token as string | undefined;

        // If on web, safely check window.location for params/hash
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const webError = urlParams.get('error_description') || urlParams.get('error') || hashParams.get('error_description');
            if (webError) errorDesc = webError;
            const webCode = urlParams.get('code');
            if (webCode) code = webCode;
            const webAccess = hashParams.get('access_token');
            if (webAccess) accessToken = webAccess;
            const webRefresh = hashParams.get('refresh_token');
            if (webRefresh) refreshToken = webRefresh;
          } catch {}
        }

        // On native mobile, also check initial deep link URL if parameters were in hash/query
        if (!code && !accessToken && Platform.OS !== 'web') {
          try {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const parsed = Linking.parse(initialUrl);
              code = code || (parsed.queryParams?.code as string);
              accessToken = accessToken || (parsed.queryParams?.access_token as string);
              refreshToken = refreshToken || (parsed.queryParams?.refresh_token as string);
              errorDesc = errorDesc || (parsed.queryParams?.error_description as string) || (parsed.queryParams?.error as string);
            }
          } catch {}
        }

        if (errorDesc) {
          if (isMounted) {
            setErrorText(decodeURIComponent(errorDesc));
          }
          setTimeout(() => {
            router.replace('/(auth)/welcome');
          }, 3500);
          return;
        }

        // 1. Check if session is already active (e.g. exchanged immediately by signInWithGoogle)
        let activeSession = (await supabase.auth.getSession()).data.session;

        // 2. In PKCE flow: if code is present in query parameters and no active session yet, exchange for session
        if (!activeSession?.user && code) {
          if (isMounted) setStatusText('Exchanging authorization code...');
          const { data: exData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exData?.session) {
            activeSession = exData.session;
          }
          if (exchangeError) {
            console.warn('exchangeCodeForSession in callback warning:', exchangeError.message);
          }
        } else if (!activeSession?.user && accessToken && refreshToken) {
          if (isMounted) setStatusText('Saving authenticated session...');
          const { data: setSessionData } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionData?.session) {
            activeSession = setSessionData.session;
          }
        }

        // 3. Retry loop if session is still settling
        if (!activeSession?.user) {
          for (let attempt = 0; attempt < 4; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            activeSession = (await supabase.auth.getSession()).data.session;
            if (activeSession?.user) break;

            const initialUser = await getInitialAuthSession();
            if (initialUser?.id) {
              useAuthStore.setState({
                user: initialUser,
                authStatus: 'authenticated',
                isAuthenticated: true,
                isLoading: false,
                authError: null,
              });
              router.replace('/(tabs)');
              return;
            }
          }
        }

        // If still no session in getSession(), check if user already active in auth store or storage
        if (!activeSession?.user) {
          const storeUser = useAuthStore.getState().user;
          const storedProfile = getStoredLocalSession();
          if (storeUser?.id || storedProfile?.id) {
            router.replace('/(tabs)');
            return;
          }

          if (isMounted) {
            setErrorText('Could not find active authentication session. Redirecting to welcome...');
          }
          setTimeout(() => router.replace('/(auth)/welcome'), 2500);
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
            id: user.id,
            handle: cleanHandle || 'researcher',
            fullName,
            avatarUrl,
            academicTitle: metadata.academic_title || 'Researcher',
            institution: metadata.institution || 'Independent Researcher',
            bio: '',
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

        // If existing user has complete profile, enter home, otherwise onboarding
        const isComplete = Boolean(
          profile &&
          profile.researchInterests &&
          profile.researchInterests.length > 0 &&
          profile.fullName &&
          profile.fullName.toLowerCase() !== 'researcher'
        );

        if (isComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
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
