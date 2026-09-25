import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  Mail,
  Building,
  GraduationCap,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../core/Button';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { UserProfile } from '../../types';
import { supabase } from '../../api/client';
import { setStoredLocalSession } from '../../api/authService';

export interface QuickOAuthModalProps {
  visible: boolean;
  provider: 'google' | 'orcid';
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickOAuthModal: React.FC<QuickOAuthModalProps> = ({
  visible,
  provider,
  onClose,
  onSuccess,
}) => {
  const isGoogle = provider === 'google';
  const signInWithDemoUser = useAuthStore((s) => s.signInWithDemoUser);

  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [loading, setLoading] = useState(false);

  // Custom profile state
  const [fullName, setFullName] = useState(isGoogle ? 'Sagar Yadav' : 'Dr. Sagar Yadav');
  const [email, setEmail] = useState(isGoogle ? 'sagar.yadav@gmail.com' : 'sagar.yadav@stanford.edu');
  const [handle, setHandle] = useState('sagaryadav');
  const [academicTitle, setAcademicTitle] = useState('Principal Investigator & Researcher');
  const [institution, setInstitution] = useState('Institute of Science & Technology');
  const [orcidId, setOrcidId] = useState('0000-0002-1825-0097');

  const presets: UserProfile[] = [
    {
      id: `usr_${provider}_sagar`,
      fullName: 'Sagar Yadav',
      handle: 'sagaryadav',
      academicTitle: 'Computational Biology Researcher',
      institution: 'Institute of Biomedical Technology',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      bio: 'Investigating neural network architectures, structural genomics, and collaborative scientific tools.',
      orcidId: isGoogle ? undefined : '0000-0002-1825-0097',
      orcidVerified: !isGoogle,
      researchInterests: ['Computational Biology', 'Neuroscience', 'Machine Learning', 'Genomics'],
      followersCount: 342,
      followingCount: 189,
      postsCount: 12,
      savedCount: 28,
      joinedDate: 'Joined recently',
    },
    {
      id: `usr_${provider}_elena`,
      fullName: 'Dr. Elena Park',
      handle: 'elenapark',
      academicTitle: 'Postdoctoral Fellow in Neuroscience',
      institution: 'Stanford University School of Medicine',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      bio: 'Synaptic plasticity, electrophysiology, and in-vivo optical imaging.',
      orcidId: '0000-0002-1825-0097',
      orcidVerified: true,
      researchInterests: ['Neuroscience', 'Synaptic Plasticity', 'Bioimaging'],
      followersCount: 1420,
      followingCount: 412,
      postsCount: 24,
      savedCount: 56,
      joinedDate: 'Joined recently',
    },
    {
      id: `usr_${provider}_marcus`,
      fullName: 'Dr. Marcus Vance',
      handle: 'marcusvance',
      academicTitle: 'Associate Professor of Genomics',
      institution: 'Broad Institute of MIT and Harvard',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      bio: 'CRISPR base editing, functional genomics, and synthetic biology.',
      orcidId: '0000-0001-9823-4122',
      orcidVerified: true,
      researchInterests: ['Genomics', 'CRISPR', 'Synthetic Biology', 'Epigenetics'],
      followersCount: 2180,
      followingCount: 520,
      postsCount: 38,
      savedCount: 89,
      joinedDate: 'Joined recently',
    },
  ];

  const handleSelectPreset = async (preset: UserProfile) => {
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Save profile into public.profiles if live Supabase client exists
    try {
      await supabase.from('profiles').upsert({
        id: preset.id,
        username: preset.handle,
        full_name: preset.fullName,
        avatar_url: preset.avatarUrl,
        academic_title: preset.academicTitle,
        institution: preset.institution,
        bio: preset.bio,
        orcid_id: preset.orcidId,
        orcid_verified: preset.orcidVerified,
        research_interests: preset.researchInterests,
      });
    } catch {}

    signInWithDemoUser(preset);
    setLoading(false);
    onSuccess();
  };

  const handleCustomSubmit = async () => {
    if (!fullName.trim() || !email.trim()) return;

    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const cleanHandle = (handle.trim() || email.split('@')[0] || 'researcher').replace(/^@/, '');
    const customUser: UserProfile = {
      id: `usr_${provider}_${Date.now()}`,
      fullName: fullName.trim(),
      handle: cleanHandle,
      academicTitle: academicTitle.trim() || 'Academic Researcher',
      institution: institution.trim() || 'Independent Research',
      bio: 'Exploring peer-reviewed literature, paper discussions, and scientific collaboration.',
      orcidId: isGoogle ? undefined : (orcidId.trim() || '0000-0002-1825-0097'),
      orcidVerified: !isGoogle,
      researchInterests: ['Interdisciplinary Science', 'Literature Review'],
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      savedCount: 0,
      joinedDate: 'Just now',
    };

    try {
      await supabase.from('profiles').upsert({
        id: customUser.id,
        username: customUser.handle,
        full_name: customUser.fullName,
        academic_title: customUser.academicTitle,
        institution: customUser.institution,
        bio: customUser.bio,
        orcid_id: customUser.orcidId,
        orcid_verified: customUser.orcidVerified,
      });
    } catch {}

    signInWithDemoUser(customUser);
    setLoading(false);
    onSuccess();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Provider Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.providerBadgeCircle,
                  isGoogle ? styles.googleCircle : styles.orcidCircle,
                ]}
              >
                {isGoogle ? (
                  <Text style={styles.googleBadgeText}>G</Text>
                ) : (
                  <Text style={styles.orcidBadgeText}>iD</Text>
                )}
              </View>

              <Text style={styles.modalTitle}>
                {isGoogle ? 'Sign In with Google' : 'Sign In with ORCID iD'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isGoogle
                  ? 'Connect instantly using your Google profile credentials.'
                  : 'Authenticate as an ORCID-verified academic researcher.'}
              </Text>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'presets' && styles.tabButtonActive]}
                onPress={() => setMode('presets')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'presets' && styles.tabButtonTextActive,
                  ]}
                >
                  Quick 1-Tap Account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, mode === 'custom' && styles.tabButtonActive]}
                onPress={() => setMode('custom')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'custom' && styles.tabButtonTextActive,
                  ]}
                >
                  Enter Your Details
                </Text>
              </TouchableOpacity>
            </View>

            {/* Presets List */}
            {mode === 'presets' && (
              <View style={styles.presetsList}>
                <Text style={styles.sectionLabel}>
                  Select an account to continue:
                </Text>

                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={styles.presetCard}
                    onPress={() => handleSelectPreset(preset)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Avatar
                      url={preset.avatarUrl}
                      name={preset.fullName}
                      size={44}
                      verified={preset.orcidVerified}
                    />
                    <View style={styles.presetMeta}>
                      <View style={styles.presetNameRow}>
                        <Text style={styles.presetName}>{preset.fullName}</Text>
                        {preset.orcidVerified && (
                          <View style={styles.verifiedTag}>
                            <CheckCircle2 size={12} color={colors.accentGreen} />
                            <Text style={styles.verifiedTagText}>ORCID</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.presetRole} numberOfLines={1}>
                        {preset.academicTitle}
                      </Text>
                      <Text style={styles.presetInst} numberOfLines={1}>
                        {preset.institution}
                      </Text>
                    </View>
                    <ArrowRight size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Custom Account Form */}
            {mode === 'custom' && (
              <View style={styles.formContainer}>
                <Text style={styles.sectionLabel}>
                  Enter your researcher details:
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <View style={styles.inputWrapper}>
                    <User size={15} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Dr. Elena Park or Sagar Yadav"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={15} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your.email@university.edu"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Academic Title / Role</Text>
                  <View style={styles.inputWrapper}>
                    <GraduationCap size={15} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={academicTitle}
                      onChangeText={setAcademicTitle}
                      placeholder="e.g. Neuroscience Postdoc, PI"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Institution / Organization</Text>
                  <View style={styles.inputWrapper}>
                    <Building size={15} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={institution}
                      onChangeText={setInstitution}
                      placeholder="e.g. Stanford University"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <Button
                  title={loading ? 'Signing In...' : `Sign in as ${fullName.split(' ')[0] || 'Researcher'}`}
                  variant="primary"
                  size="md"
                  onPress={handleCustomSubmit}
                  disabled={loading || !fullName.trim() || !email.trim()}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* Privacy notice */}
            <View style={styles.footerNote}>
              <ShieldCheck size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.footerNoteText}>
                BooffIn is an academic network. Your credentials are secure.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
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
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  providerBadgeCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  googleCircle: {
    backgroundColor: '#EA4335',
  },
  orcidCircle: {
    backgroundColor: '#A6CE39',
  },
  googleBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 22,
    fontFamily: 'serif',
  },
  orcidBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 18,
    fontFamily: 'serif',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  presetsList: {
    marginBottom: spacing.md,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  presetMeta: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  presetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  verifiedTagText: {
    ...typography.micro,
    color: colors.accentGreen,
    fontWeight: '700',
    fontSize: 9,
  },
  presetRole: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  presetInst: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 11,
  },
  formContainer: {
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: {
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    paddingVertical: spacing.xs + 3,
    fontSize: 13,
    color: colors.textPrimary,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerNoteText: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 11,
  },
});
