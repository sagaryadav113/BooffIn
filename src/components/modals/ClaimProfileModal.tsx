import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  Building2,
  BookOpen,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { OpenAlexAuthorDetails } from '../../api/openalexAuthorService';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../api/client';
import {
  normalizeOrcidId,
  fetchOrcidPersonDetails,
  connectOrcidOAuth,
  syncScholarPublications,
  OrcidPersonDetails,
} from '../../api/orcidService';
import { checkOrcidAvailability } from '../../api/authService';

export interface ClaimProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: OpenAlexAuthorDetails;
  onClaimSuccess?: () => void;
}

export const ClaimProfileModal: React.FC<ClaimProfileModalProps> = ({
  visible,
  onClose,
  profile,
  onClaimSuccess,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  // Target ORCID for this scholar profile (strictly from the viewed profile record)
  const targetOrcid = normalizeOrcidId(profile?.orcid || '');

  // Live ORCID Registry Details
  const [liveRegistryRecord, setLiveRegistryRecord] = useState<OrcidPersonDetails | null>(null);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

  // Submission & Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);

  // Query live ORCID Public Registry whenever modal opens
  useEffect(() => {
    if (!visible || !targetOrcid) return;

    let isMounted = true;
    setIsLoadingRegistry(true);
    fetchOrcidPersonDetails(targetOrcid)
      .then((res) => {
        if (!isMounted) return;
        setIsLoadingRegistry(false);
        if (res.success && res.person) {
          setLiveRegistryRecord(res.person);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingRegistry(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, targetOrcid]);

  const handleResetAndClose = () => {
    setIsClaimed(false);
    setErrorMsg(null);
    onClose();
  };

  /**
   * Finalizes the claim: strictly checks uniqueness, updates Supabase profiles table,
   * syncs scholar publications, and refreshes auth store.
   */
  const finalizeProfileClaim = async (cleanOrcid: string, verifiedVia: string) => {
    if (!currentUser?.id) {
      setErrorMsg('You must be signed in to BooffIn to link this verified scholar profile.');
      return;
    }

    // 1. Strict Uniqueness Check: Ensure no other user has verified this ORCID iD
    const availability = await checkOrcidAvailability(cleanOrcid, currentUser.id);
    if (!availability.available) {
      setErrorMsg(
        availability.error ||
          'This ORCID iD is already verified and linked to another BooffIn account. Each ORCID iD can only be bound to a single verified author account.'
      );
      return;
    }

    const institutionName =
      profile.institutions?.[0] || currentUser.institution || 'Verified Academic Institution';
    const academicTitle =
      profile.topics?.[0]?.displayName || currentUser.academicTitle || 'Verified Scholar';

    // 2. Update Supabase profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        orcid_id: cleanOrcid,
        orcid_verified: true,
        institution: institutionName,
        academic_title: academicTitle,
      })
      .eq('id', currentUser.id);

    if (updateError) {
      setErrorMsg(updateError.message || 'Could not update your profile credentials. Please try again.');
      return;
    }

    // 3. Sync scholar publications in background
    try {
      await syncScholarPublications(
        currentUser.id,
        cleanOrcid,
        profile.displayName || liveRegistryRecord?.name || currentUser.fullName
      );
    } catch (syncErr) {
      console.warn('Sync publications non-fatal error:', syncErr);
    }

    // 4. Update local auth store
    await updateProfile({
      orcidId: cleanOrcid,
      orcidVerified: true,
      institution: institutionName,
      academicTitle,
    });

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setIsClaimed(true);
    if (onClaimSuccess) onClaimSuccess();
  };

  /**
   * METHOD: Official ORCID Web Authentication (OAuth 2.0 / orcid.org)
   * Enforces anti-impersonation: Authenticated ORCID must match target profile's registered ORCID.
   */
  const handleOfficialOrcidOAuth = async () => {
    setErrorMsg(null);

    const cleanTargetOrcid = normalizeOrcidId(profile.orcid || '');
    if (!cleanTargetOrcid) {
      setErrorMsg(
        'This researcher record does not have a registered ORCID iD in OpenAlex and cannot be claimed directly via ORCID. You can connect your ORCID directly in your Profile > Scholar section.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      const oauthRes = await connectOrcidOAuth(undefined, cleanTargetOrcid);

      if (oauthRes.success && oauthRes.orcidId) {
        const authenticatedOrcid = normalizeOrcidId(oauthRes.orcidId);

        // Strict Anti-Impersonation Check: Authenticated ORCID must match the profile
        if (authenticatedOrcid !== cleanTargetOrcid) {
          setErrorMsg(
            `ORCID Mismatch: You authenticated as ORCID ${authenticatedOrcid}, but this profile is registered to ORCID ${cleanTargetOrcid}. You can only claim a profile that matches your authenticated ORCID iD.`
          );
          setIsSubmitting(false);
          return;
        }

        await finalizeProfileClaim(authenticatedOrcid, 'ORCID_OAUTH');
      } else {
        setErrorMsg(oauthRes.error || 'ORCID authentication was cancelled or could not be completed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not connect to ORCID authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleResetAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleResetAndClose}
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.orcidBadgeIcon}>
                <Text style={styles.orcidBadgeIconText}>iD</Text>
              </View>
              <Text style={styles.headerTitle}>Official Scholar Verification</Text>
            </View>
            <TouchableOpacity
              onPress={handleResetAndClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {isClaimed ? (
              // ── SUCCESS STATE ──
              <View style={styles.successContainer}>
                <View style={styles.successCircle}>
                  <CheckCircle2 size={48} color="#16A34A" />
                </View>
                <Text style={styles.successTitle}>Profile Claimed! 🎉</Text>
                <Text style={styles.successDesc}>
                  Your academic identity has been officially verified. The scholarly profile of{' '}
                  <Text style={styles.boldText}>{profile.displayName}</Text> is now bound to your
                  BooffIn account with a verified scholar badge.
                </Text>

                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => {
                    handleResetAndClose();
                    router.push('/(tabs)/profile');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>Go to My Profile</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : !currentUser?.id ? (
              // ── NOT LOGGED IN STATE ──
              <View style={styles.loggedOutContainer}>
                <AlertCircle size={40} color={colors.accentLink} />
                <Text style={styles.loggedOutTitle}>Sign In to Claim Profile</Text>
                <Text style={styles.loggedOutDesc}>
                  To protect academic integrity and prevent impersonation, you must be signed in to
                  your BooffIn account to verify and claim{' '}
                  <Text style={styles.boldText}>{profile.displayName}</Text>'s publications and metrics.
                </Text>

                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => {
                    handleResetAndClose();
                    router.push('/(auth)/welcome');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>Sign In / Create Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ── OFFICIAL ORCID VERIFICATION FLOW ──
              <View style={styles.formContainer}>
                {/* Scholar Summary Card */}
                <View style={styles.scholarPreviewCard}>
                  <Text style={styles.scholarName}>{profile.displayName}</Text>
                  {profile.institutions?.[0] ? (
                    <View style={styles.previewMetaRow}>
                      <Building2 size={13} color={colors.textSecondary} />
                      <Text style={styles.previewMetaText} numberOfLines={1}>
                        {profile.institutions[0]}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.previewMetaRow}>
                    <BookOpen size={13} color={colors.textSecondary} />
                    <Text style={styles.previewMetaText}>
                      {profile.worksCount} publications · {profile.citationCount} citations · h-index: {profile.hIndex}
                    </Text>
                  </View>
                  {targetOrcid ? (
                    <View style={styles.previewMetaRow}>
                      <Award size={13} color="#4D7C0F" />
                      <Text style={styles.previewMetaText}>
                        Registered ORCID:{' '}
                        <Text style={styles.boldText}>{targetOrcid}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Live ORCID Public Registry Check Card */}
                {targetOrcid ? (
                  <View style={styles.registryStatusCard}>
                    <View style={styles.registryStatusHeader}>
                      <View style={styles.orcidBadgeSmall}>
                        <Text style={styles.orcidBadgeSmallText}>iD</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.registryStatusTitle}>
                          {isLoadingRegistry
                            ? 'Verifying ORCID Registry...'
                            : liveRegistryRecord
                            ? 'Verified in ORCID Public Registry'
                            : 'ORCID Public Record'}
                        </Text>
                        <Text style={styles.registryStatusSubtitle}>
                          {liveRegistryRecord
                            ? `${liveRegistryRecord.name} · ${liveRegistryRecord.worksCount} public works indexed`
                            : `ORCID iD: ${targetOrcid}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://orcid.org/${targetOrcid}`)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ExternalLink size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Anti-Impersonation Notice Box */}
                <View style={targetOrcid ? styles.noticeBox : styles.noticeBoxWarning}>
                  {targetOrcid ? (
                    <ShieldCheck size={16} color="#15803D" style={{ marginTop: 2 }} />
                  ) : (
                    <AlertCircle size={16} color="#D97706" style={{ marginTop: 2 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noticeBoxTitle}>
                      {targetOrcid ? 'Anti-Impersonation Guarantee' : 'ORCID iD Not Linked'}
                    </Text>
                    <Text style={styles.noticeBoxDesc}>
                      {targetOrcid ? (
                        <>
                          Authenticate directly on <Text style={styles.boldText}>orcid.org</Text>. To guarantee scholarly authenticity, your authenticated ORCID account must match{' '}
                          <Text style={styles.boldText}>{targetOrcid}</Text>.
                        </>
                      ) : (
                        'This OpenAlex researcher record does not have a public ORCID iD linked to it. To verify your identity as an author, you can connect your ORCID directly in your Profile > Scholar section.'
                      )}
                    </Text>
                  </View>
                </View>

                {/* Error Box */}
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={14} color="#B91C1C" style={{ marginTop: 1 }} />
                    <Text style={styles.errorBoxText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Primary Action Button */}
                {targetOrcid ? (
                  <TouchableOpacity
                    style={styles.orcidOAuthBtn}
                    onPress={handleOfficialOrcidOAuth}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <View style={styles.orcidPillIcon}>
                          <Text style={styles.orcidPillIconText}>iD</Text>
                        </View>
                        <Text style={styles.orcidOAuthBtnText}>
                          Authenticate on orcid.org (Official Web Auth)
                        </Text>
                        <ExternalLink size={14} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { marginTop: spacing.sm }]}
                    onPress={() => {
                      handleResetAndClose();
                      router.push('/(tabs)/profile');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryActionBtnText}>{'Go to Profile > Scholar Section'}</Text>
                  </TouchableOpacity>
                )}

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleResetAndClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    maxHeight: '94%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 3,
  },
  orcidBadgeIcon: {
    backgroundColor: '#A6CE39',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidBadgeIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingVertical: spacing.xs,
  },
  scholarPreviewCard: {
    backgroundColor: colors.surfaceHover,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    gap: 4,
  },
  scholarName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  registryStatusCard: {
    backgroundColor: '#F8FAF5',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
  },
  registryStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orcidBadgeSmall: {
    backgroundColor: '#A6CE39',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidBadgeSmallText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  registryStatusTitle: {
    ...typography.captionBold,
    color: '#166534',
    fontSize: 12,
  },
  registryStatusSubtitle: {
    ...typography.micro,
    color: '#15803D',
    fontSize: 11,
    marginTop: 1,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  noticeBoxWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  noticeBoxTitle: {
    ...typography.captionBold,
    color: '#166534',
    fontSize: 12.5,
    marginBottom: 2,
  },
  noticeBoxDesc: {
    ...typography.caption,
    color: '#15803D',
    fontSize: 11.5,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: spacing.md,
  },
  errorBoxText: {
    ...typography.caption,
    color: '#B91C1C',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  orcidOAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#A6CE39',
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  orcidPillIcon: {
    backgroundColor: '#FFFFFF',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidPillIconText: {
    color: '#A6CE39',
    fontWeight: '900',
    fontSize: 11,
  },
  orcidOAuthBtnText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  primaryActionBtnText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cancelBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  successCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  successDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  loggedOutContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loggedOutTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  loggedOutDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontSize: 13,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  formContainer: {},
});
