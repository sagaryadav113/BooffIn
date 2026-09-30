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
} from 'lucide-react-native';
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
  const signInWithORCID = useAuthStore((s) => s.signInWithORCID);

  const initialOrcid = currentUser?.orcidId || profile?.orcid || '';
  const [inputOrcid, setInputOrcid] = useState(initialOrcid);
  const [accountPassword, setAccountPassword] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'orcid_oauth' | 'password_auth'>('orcid_oauth');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);

  // 1. Official ORCID OAuth Verification
  const handleOfficialOrcidOAuth = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      const success = await signInWithORCID();
      if (success) {
        setIsClaimed(true);
        if (onClaimSuccess) onClaimSuccess();
      } else {
        setErrorMsg('ORCID authentication was cancelled or not completed. Please try again or use password verification.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not connect to ORCID OAuth service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Account Password & Institutional Email Authorization
  const handlePasswordClaim = async () => {
    setErrorMsg(null);
    const cleanOrcid = normalizeOrcidId(inputOrcid);

    if (!accountPassword.trim()) {
      setErrorMsg('Please enter your BooffIn account password to authenticate this claim.');
      return;
    }

    if (!cleanOrcid) {
      setErrorMsg('Please enter your 16-digit ORCID ID.');
      return;
    }

    if (!isValidOrcidId(cleanOrcid)) {
      setErrorMsg('Invalid ORCID format. Expected format: 0000-0000-0000-0000.');
      return;
    }

    // Check institutional email format if provided
    if (institutionalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(institutionalEmail.trim())) {
      setErrorMsg('Please enter a valid institutional email address.');
      return;
    }

    // If profile has an established ORCID, ensure entered matches
    if (profile.orcid) {
      const cleanProfileOrcid = normalizeOrcidId(profile.orcid);
      if (cleanProfileOrcid && cleanOrcid !== cleanProfileOrcid) {
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
      // Step A: Verify account password with Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userEmail = authData?.user?.email;

      if (userEmail) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: accountPassword,
        });

        if (verifyErr) {
          setErrorMsg('Incorrect password. Please enter your valid BooffIn account password.');
          setIsSubmitting(false);
          return;
        }
      }

      // Step B: Update Supabase profiles table
      const institutionName = profile.institutions?.[0] || currentUser.institution || '';
      const academicTitle = profile.topics?.[0]?.displayName || currentUser.academicTitle || 'Verified Researcher';

      if (currentUser?.id) {
        await supabase
          .from('profiles')
          .update({
            orcid_id: cleanOrcid,
            is_orcid_verified: true,
            institution: institutionName,
            academic_title: academicTitle,
          })
          .eq('id', currentUser.id);

        // Step C: Update authStore
        await updateProfile({
          orcidId: cleanOrcid,
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
    setAccountPassword('');
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
              <ShieldCheck size={20} color="#4D7C0F" />
              <Text style={styles.headerTitle}>Official Profile Verification</Text>
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
                  Your identity has been verified. The scholarly profile of{' '}
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
                  To protect academic integrity, you must be signed in to your BooffIn account to officially claim{' '}
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

                {/* Verification Method Tabs */}
                <View style={styles.tabSelectorRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'orcid_oauth' && styles.tabBtnActive]}
                    onPress={() => {
                      setActiveTab('orcid_oauth');
                      setErrorMsg(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Award size={13} color={activeTab === 'orcid_oauth' ? '#4D7C0F' : colors.textSecondary} />
                    <Text
                      style={[
                        styles.tabBtnText,
                        activeTab === 'orcid_oauth' && styles.tabBtnTextActive,
                      ]}
                    >
                      ORCID Official Sign-In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'password_auth' && styles.tabBtnActive]}
                    onPress={() => {
                      setActiveTab('password_auth');
                      setErrorMsg(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Lock size={13} color={activeTab === 'password_auth' ? colors.textPrimary : colors.textSecondary} />
                    <Text
                      style={[
                        styles.tabBtnText,
                        activeTab === 'password_auth' && styles.tabBtnTextActive,
                      ]}
                    >
                      Password Auth
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Error Box */}
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={14} color="#B91C1C" />
                    <Text style={styles.errorBoxText}>{errorMsg}</Text>
                  </View>
                )}

                {/* TAB 1: OFFICIAL ORCID OAUTH */}
                {activeTab === 'orcid_oauth' ? (
                  <View style={styles.oauthSection}>
                    <Text style={styles.instructionsText}>
                      To prevent unauthorized claims, ORCID requires you to sign in with your official ORCID credentials. This cryptographically proves your identity.
                    </Text>

                    <TouchableOpacity
                      style={styles.orcidOAuthBtn}
                      onPress={handleOfficialOrcidOAuth}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#4D7C0F" />
                      ) : (
                        <>
                          <Award size={18} color="#A6CE39" />
                          <Text style={styles.orcidOAuthBtnText}>Sign In with ORCID (Official OAuth)</Text>
                          <ExternalLink size={14} color="#4D7C0F" />
                        </>
                      )}
                    </TouchableOpacity>

                    <Text style={styles.securityNote}>
                      🔒 Authenticated directly through orcid.org. Your ORCID password is never shared with BooffIn.
                    </Text>
                  </View>
                ) : (
                  // TAB 2: PASSWORD & INSTITUTIONAL AUTH
                  <View style={styles.passwordSection}>
                    <Text style={styles.instructionsText}>
                      Confirm your BooffIn password and ORCID credentials to authorize profile linking under academic integrity standards.
                    </Text>

                    {/* Password Input */}
                    <View style={styles.inputWrap}>
                      <View style={styles.inputLabelRow}>
                        <Lock size={12} color={colors.textPrimary} />
                        <Text style={styles.inputLabel}>Your BooffIn Account Password *</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter your account password"
                        placeholderTextColor={colors.textSecondary}
                        value={accountPassword}
                        onChangeText={(val) => {
                          setAccountPassword(val);
                          setErrorMsg(null);
                        }}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>

                    {/* ORCID iD Input */}
                    <View style={styles.inputWrap}>
                      <View style={styles.inputLabelRow}>
                        <Award size={12} color={colors.textPrimary} />
                        <Text style={styles.inputLabel}>Your 16-Digit ORCID iD *</Text>
                      </View>
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
                    </View>

                    {/* Institutional Email (Optional/Extra verification) */}
                    <View style={styles.inputWrap}>
                      <View style={styles.inputLabelRow}>
                        <Mail size={12} color={colors.textSecondary} />
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

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handlePasswordClaim}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryActionBtnText}>Authorize & Claim Profile</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

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
    maxHeight: '92%',
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
  tabSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surfaceHover,
    padding: 3,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  tabBtnTextActive: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  instructionsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  oauthSection: {
    gap: spacing.sm,
  },
  orcidOAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F8EA',
    borderWidth: 1.5,
    borderColor: '#A6CE39',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  orcidOAuthBtnText: {
    ...typography.bodyBold,
    color: '#3F6212',
    fontSize: 13.5,
  },
  securityNote: {
    ...typography.micro,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 4,
  },
  passwordSection: {
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
    paddingVertical: 11,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryActionBtnText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  cancelBtn: {
    paddingVertical: 9,
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
