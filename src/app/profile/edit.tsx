import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Camera, Check, Globe, MapPin, User, Building, BookOpen, ExternalLink, X, Image as ImageIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Button } from '../../components/core/Button';
import { Avatar } from '../../components/core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { persistUserProfile } from '../../api/authService';

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState(user?.avatarUrl || '');

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [handle, setHandle] = useState(user?.handle || '');
  const [academicTitle, setAcademicTitle] = useState(user?.academicTitle || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [country, setCountry] = useState(user?.country || 'India');
  const [location, setLocation] = useState(user?.location || '');
  const [researchInterestsInput, setResearchInterestsInput] = useState(
    (user?.researchInterests || []).join(', ')
  );
  const [orcidId, setOrcidId] = useState(user?.orcidId || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    const parsedInterests = researchInterestsInput
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const cleanHandle = handle.trim().replace(/^@/, '').toLowerCase();

    const updates = {
      avatarUrl: avatarUrl.trim() || undefined,
      fullName: fullName.trim(),
      handle: cleanHandle,
      academicTitle: academicTitle.trim(),
      institution: institution.trim(),
      bio: bio.trim(),
      country: country.trim(),
      location: location.trim(),
      researchInterests: parsedInterests.length > 0 ? parsedInterests : ['Scientific Research'],
      orcidId: orcidId.trim() || undefined,
      orcidVerified: !!orcidId.trim(),
      websiteUrl: websiteUrl.trim() || undefined,
    };

    updateProfile(updates);

    if (user?.id) {
      await persistUserProfile(user.id, updates);
    }

    setIsSaving(false);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    router.back();
  };

  const handleSavePhotoUrl = () => {
    setAvatarUrl(tempPhotoUrl.trim());
    setPhotoModalOpen(false);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    setTempPhotoUrl('');
    setPhotoModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <AppHeader
        showBack
        title="Edit Researcher Profile"
        rightElement={
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveHeaderButton, isSaving && { opacity: 0.6 }]}
          >
            <Text style={styles.saveHeaderText}>{isSaving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Professional Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Avatar
                url={avatarUrl || undefined}
                name={fullName || 'Researcher'}
                size={88}
                verified={!!orcidId.trim()}
              />
              <TouchableOpacity
                onPress={() => {
                  setTempPhotoUrl(avatarUrl);
                  setPhotoModalOpen(true);
                }}
                style={styles.avatarBadgeButton}
                activeOpacity={0.8}
              >
                <Camera size={14} color={colors.white} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setTempPhotoUrl(avatarUrl);
                setPhotoModalOpen(true);
              }}
              style={styles.changePhotoBtn}
            >
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Sidhant S. Mishra or Dr. Jane Doe"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Username / Handle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username / Handle</Text>
              <View style={styles.inputWithPrefix}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  style={[styles.input, styles.inputClean]}
                  value={handle}
                  onChangeText={setHandle}
                  placeholder="username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Academic Role / Identity */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Academic Role / Status</Text>
              <TextInput
                style={styles.input}
                value={academicTitle}
                onChangeText={setAcademicTitle}
                placeholder="e.g. Neuroscience Student, PhD Candidate, Professor"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.fieldHint}>
                Students, independent researchers, and enthusiasts are equally welcome.
              </Text>
            </View>

            {/* Institution / Affiliation */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institution / Organization</Text>
              <TextInput
                style={styles.input}
                value={institution}
                onChangeText={setInstitution}
                placeholder="e.g. Delhi University / Independent / MIT"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio & Research Summary</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                placeholder="Share your scientific questions, projects, or interests..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Country & Location */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="e.g. India, USA, UK"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>City / Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. New Delhi, Boston"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Research Interests */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Research Interests (Comma separated)</Text>
              <TextInput
                style={styles.input}
                value={researchInterestsInput}
                onChangeText={setResearchInterestsInput}
                placeholder="e.g. Neuroscience, Synaptic Plasticity, AI in Science"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* ORCID iD */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithBadge}>
                <Text style={styles.label}>ORCID iD</Text>
                <Text style={styles.orcidBadge}>Verified Researcher</Text>
              </View>
              <TextInput
                style={styles.input}
                value={orcidId}
                onChangeText={setOrcidId}
                placeholder="0000-0002-8140-5231"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <Text style={styles.fieldHint}>
                Linking your ORCID grants the green verified badge and connects your published DOI record.
              </Text>
            </View>

            {/* Website URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Personal Website / Lab Page</Text>
              <TextInput
                style={styles.input}
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="https://yourwebsite.edu"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Submit Button */}
            <Button
              title={isSaving ? 'Saving Changes...' : 'Save Changes'}
              variant="primary"
              size="lg"
              onPress={handleSave}
              disabled={isSaving}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo URL Modal */}
      <Modal
        visible={photoModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Profile Photo</Text>
              <TouchableOpacity onPress={() => setPhotoModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter a direct image URL (JPEG, PNG, or WebP) for your academic portrait.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={tempPhotoUrl}
              onChangeText={setTempPhotoUrl}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              {avatarUrl ? (
                <TouchableOpacity onPress={handleRemovePhoto} style={styles.modalRemoveBtn}>
                  <Text style={styles.modalRemoveText}>Remove Photo</Text>
                </TouchableOpacity>
              ) : null}
              <Button
                title="Apply Photo"
                variant="primary"
                size="md"
                onPress={handleSavePhotoUrl}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl * 2,
  },
  saveHeaderButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  saveHeaderText: {
    ...typography.captionBold,
    color: colors.white,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatarBadgeButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.black,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  changePhotoBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  changePhotoText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orcidBadge: {
    ...typography.micro,
    color: colors.accentGreen,
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  input: {
    ...typography.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingLeft: spacing.md,
  },
  inputPrefix: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inputClean: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHint: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalInput: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalRemoveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalRemoveText: {
    ...typography.captionBold,
    color: colors.accentRed,
  },
});
