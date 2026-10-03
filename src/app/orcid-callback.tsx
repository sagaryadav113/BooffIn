import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, AlertCircle } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';
import { normalizeOrcidId, ORCID_OAUTH_TOKEN_URL, syncScholarPublications } from '../api/orcidService';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export default function OrcidCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    orcid?: string;
    error?: string;
    error_description?: string;
  }>();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying official ORCID authorization...');
  const currentUser = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        let code = params.code;
        let orcid = params.orcid;
        const error = params.error || params.error_description;

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (!code) code = urlParams.get('code') || undefined;
          if (!orcid) orcid = urlParams.get('orcid') || undefined;

          // Notify opener popup
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: 'ORCID_AUTH_SUCCESS',
                code,
                orcid,
                error,
                url: window.location.href,
              },
              '*'
            );
            setTimeout(() => {
              try {
                window.close();
              } catch {}
            }, 600);
            return;
          }
        }

        if (error) {
          if (isMounted) {
            setStatus('error');
            setMessage(decodeURIComponent(error));
          }
          setTimeout(() => router.replace('/(tabs)/profile'), 2500);
          return;
        }

        // Standalone or same-tab completion:
        if (code && process.env.EXPO_PUBLIC_ORCID_CLIENT_SECRET && currentUser?.id) {
          if (isMounted) setMessage('Exchanging token with ORCID registry...');

          const tokenRes = await fetch(ORCID_OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.EXPO_PUBLIC_ORCID_CLIENT_ID || '',
              client_secret: process.env.EXPO_PUBLIC_ORCID_CLIENT_SECRET || '',
              grant_type: 'authorization_code',
              code,
              redirect_uri:
                process.env.EXPO_PUBLIC_ORCID_REDIRECT_URI ||
                'https://booff-in.vercel.app/orcid-callback',
            }).toString(),
          });

          if (tokenRes.ok) {
            const data = await tokenRes.json();
            if (data.orcid) {
              const cleanOrcid = normalizeOrcidId(data.orcid);
              await supabase
                .from('profiles')
                .update({
                  orcid_id: cleanOrcid,
                  orcid_verified: true,
                })
                .eq('id', currentUser.id);

              await updateProfile({
                orcidId: cleanOrcid,
                orcidVerified: true,
              });

              await syncScholarPublications(currentUser.id, cleanOrcid, data.name || currentUser.fullName);
            }
          }
        }

        if (isMounted) {
          setStatus('success');
          setMessage('ORCID verification complete! Redirecting...');
        }
        setTimeout(() => router.replace('/(tabs)/profile'), 1200);
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setMessage(err.message || 'Could not complete ORCID callback.');
        }
        setTimeout(() => router.replace('/(tabs)/profile'), 2500);
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [params, currentUser?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>iD</Text>
        </View>

        <Text style={styles.title}>Official ORCID Verification</Text>
        <Text style={styles.subtitle}>{message}</Text>

        {status === 'processing' && (
          <ActivityIndicator size="large" color="#A6CE39" style={{ marginTop: spacing.md }} />
        )}

        {status === 'success' && (
          <View style={styles.successBadge}>
            <ShieldCheck size={18} color="#16A34A" />
            <Text style={styles.successBadgeText}>Identity Verified</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.errorBadge}>
            <AlertCircle size={18} color={colors.accentRed} />
            <Text style={styles.errorBadgeText}>Verification Error</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A6CE39',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  successBadgeText: {
    ...typography.captionBold,
    color: '#15803D',
    fontSize: 12,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  errorBadgeText: {
    ...typography.captionBold,
    color: colors.accentRed,
    fontSize: 12,
  },
});
