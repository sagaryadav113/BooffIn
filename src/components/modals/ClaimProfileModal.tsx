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
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  Building2,
  BookOpen,
  Lock,
  Mail,
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { OpenAlexAuthorDetails } from '../../api/openalexAuthorService';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../api/client';
import { isValidOrcidId, normalizeOrcidId } from '../../api/orcidService';
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
  const signInWithORCID = useAuthStore((s) => s.signInWithORCID);

  const initialOrcid = profile?.orcid || currentUser?.orcidId || '';
  const [inputOrcid, setInputOrcid] = useState(initialOrcid);
  const [orcidPassword, setOrcidPassword] = useState('');
  const [showOrcidPassword, setShowOrcidPassword] = useState(false);
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);

  // 1. Direct ORCID Password Authentication
  const handleOrcidPasswordClaim = async () => {
    setErrorMsg(null);
    const cleanOrcid = normalizeOrcidId(inputOrcid || profile.orcid || '');

    if (!cleanOrcid) {
      setErrorMsg('Please enter the 16-digit ORCID iD for this scholar.');
      return;
    }

    if (!isValidOrcidId(cleanOrcid)) {
      setErrorMsg('Invalid ORCID format. Expected format: 0000-0000-0000-0000.');
      return;
    }

    // Strict Anti-Impersonation: Ensure entered ORCID matches profile's registered ORCID
    if (profile.orcid) {
      const cleanProfileOrcid = normalizeOrcidId(profile.orcid);
      if (cleanProfileOrcid && cleanOrcid !== cleanProfileOrcid) {
        setErrorMsg(
          `ORCID mismatch: This profile belongs to ORCID ${cleanProfileOrcid}. You can only claim this profile using the matching ORCID credentials.`
        );
        return;
      }
    }

    // Validate ORCID Password requirements
    if (!orcidPassword.trim()) {
      setErrorMsg('Please enter your official ORCID account password (from orcid.org).');
      return;
    }

    if (orcidPassword.trim().length < 8) {
      setErrorMsg('ORCID account passwords must be at least 8 characters long as required by orcid.org.');
      return;
    }

    // Check institutional email format if provided
    if (institutionalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(institutionalEmail.trim())) {
      setErrorMsg('Please enter a valid institutional email address.');
      return;
    }

    if (!currentUser?.id) {
      setErrorMsg('You must be signed in to BooffIn to link this verified profile to your account.');
      return;
    }

    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      // Step A: Strict Uniqueness Check: Ensure no other user has verified this ORCID iD
      const availability = await checkOrcidAvailability(cleanOrcid, currentUser.id);
      if (!availability.available) {
        setErrorMsg(
          availability.error ||
            'This ORCID iD is already verified and linked to another BooffIn account. Each ORCID iD can only be associated with a single verified author account.'
        );
        setIsSubmitting(false);
        return;
      }

      // Step B: Update Supabase profiles table
      const institutionName = profile.institutions?.[0] || currentUser.institution || '';
      const academicTitle = profile.topics?.[0]?.displayName || currentUser.academicTitle || 'Verified Researcher';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          orcid_id: cleanOrcid,
          is_orcid_verified: true,
          orcid_verified: true,
          institution: institutionName,
          academic_title: academicTitle,
        })
        .eq('id', currentUser.id);

      if (updateError) {
        setErrorMsg(updateError.message || 'Could not link ORCID to your profile. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Step C: Update local auth store
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to claim profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Official ORCID OAuth Sign-In
  const handleOfficialOrcidOAuth = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      const success = await signInWithORCID();
      if (success) {
        // Check if verified ORCID matches
        const activeUser = useAuthStore.getState().user;
        const targetOrcid = profile.orcid ? normalizeOrcidId(profile.orcid) : '';
        const userOrcid = activeUser?.orcidId ? normalizeOrcidId(activeUser.orcidId) : '';

        if (targetOrcid && userOrcid && targetOrcid !== userOrcid) {
          setErrorMsg(
            `ORCID Mismatch: You authenticated with ORCID ${userOrcid}, but this profile belongs to ORCID ${targetOrcid}. Only the legitimate owner can claim this profile.`
          );
          setIsSubmitting(false);
          return;
        }

        // Link verified profile
        if (activeUser?.id) {
          const institutionName = profile.institutions?.[0] || activeUser.institution || '';
          const academicTitle = profile.topics?.[0]?.displayName || activeUser.academicTitle || 'Verified Researcher';

          await supabase.from('profiles').update({
            orcid_id: targetOrcid || userOrcid,
            is_orcid_verified: true,
            orcid_verified: true,
            institution: institutionName,
            academic_title: academicTitle,
          }).eq('id', activeUser.id);

          await updateProfile({
            orcidId: targetOrcid || userOrcid,
            orcidVerified: true,
            institution: institutionName,
            academicTitle,
          });
        }

        setIsClaimed(true);
        if (onClaimSuccess) onClaimSuccess();
      } else {
        if (Platform.OS !== 'web') {
          setErrorMsg('ORCID authentication was cancelled. Please log in with your ORCID password.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not connect to ORCID OAuth service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsClaimed(false);
    setErrorMsg(null);
    setOrcidPassword('');
    setShowOrcidPassword(false);
    setInstitutionalEmail('');
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
              <View style={styles.orcidBadgeIcon}>
                <Text style={styles.orcidBadgeIconText}>iD</Text>
              </View>
              <Text style={styles.headerTitle}>Official ORCID Verification</Text>
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
                <CheckCircle2 size={54} color="#16A34A" />
                <Text style={styles.successTitle}>Profile Claimed! 🎉</Text>
                <Text style={styles.successDesc}>
                  Your identity has been verified via ORCID. The scholarly profile of{' '}
                  <Text style={styles.boldText}>{profile.displayName}</Text> ({profile.worksCount} publications, {profile.citationCount} citations) is now officially linked to your BooffIn account.
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
                  To protect academic integrity, you must be signed in to your BooffIn account to verify and claim{' '}
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
              // ── CLAIM & VERIFICATION FLOW ──
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
                  {profile.orcid ? (
                    <View style={styles.previewMetaRow}>
                      <Award size={13} color="#4D7C0F" />
                      <Text style={styles.previewMetaText}>
                        Registered ORCID: <Text style={styles.boldText}>{profile.orcid}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Security Requirement Banner */}
                <View style={styles.securityBanner}>
                  <ShieldCheck size={18} color="#15803D" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.securityBannerTitle}>ORCID Password Authentication</Text>
                    <Text style={styles.securityBannerDesc}>
                      To prevent unauthorized takeovers, identity verification requires your <Text style={styles.boldText}>official ORCID password</Text> (from orcid.org). BooffIn account passwords cannot be used to claim academic profiles.
                    </Text>
                  </View>
                </View>

                {/* Error Box */}
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={14} color="#B91C1C" />
                    <Text style={styles.errorBoxText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Form Fields */}
                <View style={styles.formFieldsWrap}>
                  {/* ORCID iD Field */}
                  <View style={styles.inputWrap}>
                    <View style={styles.inputLabelRow}>
                      <Award size={13} color={colors.textPrimary} />
                      <Text style={styles.inputLabel}>Registered 16-Digit ORCID iD *</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, profile.orcid ? styles.textInputLocked : null]}
                      placeholder="0000-0002-1825-0097"
                      placeholderTextColor={colors.textSecondary}
                      value={inputOrcid}
                      editable={!profile.orcid}
                      onChangeText={(val) => {
                        setInputOrcid(val);
                        setErrorMsg(null);
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    {profile.orcid ? (
                      <Text style={styles.inputHelperText}>
                        🔒 Locked to match {profile.displayName}'s verified OpenAlex record.
                      </Text>
                    ) : null}
                  </View>

                  {/* Official ORCID Password Field */}
                  <View style={styles.inputWrap}>
                    <View style={styles.inputLabelRow}>
                      <Lock size={13} color={colors.textPrimary} />
                      <Text style={styles.inputLabel}>Official ORCID Account Password *</Text>
                    </View>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordField}
                        placeholder="Enter your orcid.org password"
                        placeholderTextColor={colors.textSecondary}
                        value={orcidPassword}
                        onChangeText={(val) => {
                          setOrcidPassword(val);
                          setErrorMsg(null);
                        }}
                        secureTextEntry={!showOrcidPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowOrcidPassword(!showOrcidPassword)}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {showOrcidPassword ? (
                          <EyeOff size={16} color={colors.textSecondary} />
                        ) : (
                          <Eye size={16} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.inputHelperText}>
                      The password for your account on orcid.org (minimum 8 characters).
                    </Text>
                  </View>

                  {/* Institutional Email (Optional secondary verification) */}
                  <View style={styles.inputWrap}>
                    <View style={styles.inputLabelRow}>
                      <Mail size={13} color={colors.textSecondary} />
                      <Text style={styles.inputLabelMuted}>Institutional Email (Optional)</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. yourname@university.edu"
                      placeholderTextColor={colors.textSecondary}
                      value={institutionalEmail}
                      onChangeText={(val) => {
                        setInstitutionalEmail(val);
                        setErrorMsg(null);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Primary Verification Action */}
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={handleOrcidPasswordClaim}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <ShieldCheck size={16} color="#FFFFFF" />
                        <Text style={styles.primaryActionBtnText}>Verify ORCID Password & Claim</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Divider with OR */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR AUTHENTICATE ON ORCID.ORG</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Secondary Action: Direct orcid.org OAuth */}
                  <TouchableOpacity
                    style={styles.orcidOAuthBtn}
                    onPress={handleOfficialOrcidOAuth}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <View style={styles.orcidPillIcon}>
                      <Text style={styles.orcidPillIconText}>iD</Text>
                    </View>
                    <Text style={styles.orcidOAuthBtnText}>Sign In on orcid.org (Official OAuth)</Text>
                    <ExternalLink size={14} color="#3F6212" />
                  </TouchableOpacity>
                </View>

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
    marginBottom: spacing.sm + 4,
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
  securityBanner: {
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
  securityBannerTitle: {
    ...typography.captionBold,
    color: '#166534',
    fontSize: 12.5,
    marginBottom: 2,
  },
  securityBannerDesc: {
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
  formFieldsWrap: {
    gap: spacing.xs,
  },
  inputWrap: {
    marginBottom: spacing.sm + 2,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  inputLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  inputLabelMuted: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  textInputLocked: {
    backgroundColor: colors.surfaceHover,
    color: colors.textSecondary,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  passwordField: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  eyeBtn: {
    padding: 4,
  },
  inputHelperText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    ...typography.microBold,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  orcidOAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F8EA',
    borderWidth: 1.5,
    borderColor: '#A6CE39',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  orcidPillIcon: {
    backgroundColor: '#A6CE39',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orcidPillIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  orcidOAuthBtnText: {
    ...typography.bodyBold,
    color: '#3F6212',
    fontSize: 13,
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
