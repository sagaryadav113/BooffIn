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
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Camera, Check, Globe, MapPin, User, Building, BookOpen, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Button } from '../../components/core/Button';
import { Avatar } from '../../components/core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&auto=format&fit=crop&q=80',
];

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || PRESET_AVATARS[0]);
  const [fullName, setFullName] = useState(user.fullName);
  const [handle, setHandle] = useState(user.handle);
  const [academicTitle, setAcademicTitle] = useState(user.academicTitle);
  const [institution, setInstitution] = useState(user.institution);
  const [bio, setBio] = useState(user.bio);
  const [country, setCountry] = useState(user.country || 'India');
  const [location, setLocation] = useState(user.location || '');
  const [researchInterestsInput, setResearchInterestsInput] = useState(
    (user.researchInterests || []).join(', ')
  );
  const [orcidId, setOrcidId] = useState(user.orcidId || '');
  const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || '');

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name cannot be empty.');
      return;
    }

    const parsedInterests = researchInterestsInput
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    updateProfile({
      avatarUrl,
      fullName: fullName.trim(),
      handle: handle.trim().replace(/^@/, ''),
      academicTitle: academicTitle.trim(),
      institution: institution.trim(),
      bio: bio.trim(),
      country: country.trim(),
      location: location.trim(),
      researchInterests: parsedInterests.length > 0 ? parsedInterests : ['Scientific Research'],
      orcidId: orcidId.trim() || undefined,
      orcidVerified: !!orcidId.trim(),
      websiteUrl: websiteUrl.trim() || undefined,
    });

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <AppHeader
        showBack
        title="Edit Researcher Profile"
        rightElement={
          <TouchableOpacity onPress={handleSave} style={styles.saveHeaderButton}>
            <Text style={styles.saveHeaderText}>Save</Text>
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
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Avatar
                url={avatarUrl}
                name={fullName}
                size={88}
                verified={!!orcidId.trim()}
              />
            </View>
            <Text style={styles.avatarLabel}>Choose profile portrait:</Text>
            <View style={styles.presetAvatarsRow}>
              {PRESET_AVATARS.map((url, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setAvatarUrl(url)}
                  style={[
                    styles.presetAvatarBtn,
                    avatarUrl === url && styles.presetAvatarBtnSelected,
                  ]}
                >
                  <Image source={{ uri: url }} style={styles.presetAvatarImg} />
                  {avatarUrl === url && (
                    <View style={styles.presetCheckmark}>
                      <Check size={10} color={colors.white} strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
              title="Save Changes"
              variant="primary"
              size="lg"
              onPress={handleSave}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: spacing.md,
  },
  avatarLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  presetAvatarsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  presetAvatarBtnSelected: {
    borderColor: colors.black,
  },
  presetAvatarImg: {
    width: '100%',
    height: '100%',
  },
  presetCheckmark: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.black,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
});
