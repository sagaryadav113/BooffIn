import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { X, Award, CheckCircle2, AlertCircle, Building2, BookOpen, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { OpenAlexAuthorDetails } from '../../api/openalexAuthorService';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../api/client';
import { isValidOrcidId, normalizeOrcidId } from '../../api/orcidService';

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

  const initialOrcid = currentUser?.orcidId || profile?.orcid || '';
  const [inputOrcid, setInputOrcid] = useState(initialOrcid);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);

  const handleClaim = async () => {
    setErrorMsg(null);
    const cleanInput = normalizeOrcidId(inputOrcid);

    if (!cleanInput) {
      setErrorMsg('Please enter your 16-digit ORCID ID.');
      return;
    }

    if (!isValidOrcidId(cleanInput)) {
      setErrorMsg('Invalid ORCID format. Expected format: 0000-0000-0000-0000.');
      return;
    }

    // If profile has an established ORCID, ensure entered matches
    if (profile.orcid) {
      const cleanProfileOrcid = normalizeOrcidId(profile.orcid);
      if (cleanProfileOrcid && cleanInput !== cleanProfileOrcid) {
        setErrorMsg(
          `ORCID mismatch. This profile is registered under ORCID ${cleanProfileOrcid}. Your entered ORCID must match to claim this profile.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      // 1. Update Supabase profiles table
      const institutionName = profile.institutions?.[0] || currentUser.institution || '';
      const academicTitle = profile.topics?.[0]?.displayName || currentUser.academicTitle || 'Verified Researcher';

      if (currentUser?.id) {
        await supabase
          .from('profiles')
          .update({
            orcid_id: cleanInput,
            is_orcid_verified: true,
            institution: institutionName,
            academic_title: academicTitle,
          })
          .eq('id', currentUser.id);

        // 2. Update authStore
        await updateProfile({
          orcidId: cleanInput,
          orcidVerified: true,
          institution: institutionName,
          academicTitle,
        });
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setIsClaimed(true);
      if (onClaimSuccess) onClaimSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to claim profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsClaimed(false);
    setErrorMsg(null);
    onClose();
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
              <Award size={20} color="#4D7C0F" />
              <Text style={styles.headerTitle}>Claim Researcher Profile</Text>
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
                <CheckCircle2 size={52} color="#16A34A" />
                <Text style={styles.successTitle}>Profile Claimed! 🎉</Text>
                <Text style={styles.successDesc}>
                  Your BooffIn account is now verified with ORCID{' '}
                  <Text style={styles.boldText}>{normalizeOrcidId(inputOrcid)}</Text>.
                  {'\n\n'}
                  The scholarly works ({profile.worksCount} publications, {profile.citationCount} citations) of{' '}
                  <Text style={styles.boldText}>{profile.displayName}</Text> are linked to your identity.
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
                </TouchableOpacity>
              </View>
            ) : !currentUser?.id ? (
              // ── NOT LOGGED IN STATE ──
              <View style={styles.loggedOutContainer}>
                <AlertCircle size={40} color={colors.accentLink} />
                <Text style={styles.loggedOutTitle}>Sign in to Claim Profile</Text>
                <Text style={styles.loggedOutDesc}>
                  You need an active BooffIn account to claim and verify authorship of{' '}
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
              // ── CLAIM / VERIFICATION FORM ──
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
                </View>

                {/* Info Text */}
                <Text style={styles.instructionsText}>
                  {profile.orcid
                    ? `This profile is indexed under ORCID ${profile.orcid}. Confirm or enter your matching ORCID ID to claim ownership.`
                    : `Enter your 16-digit ORCID ID to claim and verify authorship of these publications on BooffIn.`}
                </Text>

                {/* Input Field */}
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Your ORCID iD</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0000-0002-1825-0097"
                    placeholderTextColor={colors.textSecondary}
                    value={inputOrcid}
                    onChangeText={(val) => {
                      setInputOrcid(val);
                      setErrorMsg(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <Text style={styles.inputHint}>Format: 0000-0000-0000-0000 (16 digits)</Text>
                </View>

                {/* Error Message */}
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={14} color="#B91C1C" />
                    <Text style={styles.errorBoxText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleClaim}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Verify & Claim Profile</Text>
                  )}
                </TouchableOpacity>

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
    maxHeight: '90%',
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
    gap: spacing.xs + 2,
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
    marginBottom: spacing.md,
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
  instructionsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputWrap: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginBottom: 6,
    fontSize: 12.5,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputHint: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 4,
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
  primaryActionBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryActionBtnText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cancelBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
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
