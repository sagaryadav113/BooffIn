import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Globe,
  MapPin,
  User,
  Building,
  BookOpen,
  ExternalLink,
  Upload,
  Tag,
  GraduationCap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Button } from '../../components/core/Button';
import { useAuthStore } from '../../store/useAuthStore';
import {
  validateUsername,
  checkUsernameAvailability,
  normalizeHandle,
} from '../../api/authService';
import {
  pickAvatarImage,
  pickBannerImage,
  uploadProfileAvatar,
  uploadProfileBanner,
  removeProfileAvatar,
  removeProfileBanner,
} from '../../api/storageService';

const DEFAULT_BANNER_FALLBACK = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80';

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(user?.bannerUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

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

  // Async verification status
  const [asyncStatus, setAsyncStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string | null;
    normalized: string;
  }>({
    checking: false,
    available: null,
    message: null,
    normalized: '',
  });

  const cleanHandle = normalizeHandle(handle);
  const isCurrentHandle = cleanHandle === normalizeHandle(user?.handle);
  const valResult = cleanHandle ? validateUsername(cleanHandle) : null;

  // Derived handle status without setState in effect
  const handleStatus = React.useMemo(() => {
    if (!cleanHandle) {
      return { checking: false, available: null, message: null, normalized: '' };
    }
    if (isCurrentHandle) {
      return {
        checking: false,
        available: true,
        message: `@${cleanHandle} is your current handle`,
        normalized: cleanHandle,
      };
    }
    if (valResult && !valResult.isValid) {
      return {
        checking: false,
        available: false,
        message: valResult.error,
        normalized: cleanHandle,
      };
    }
    if (asyncStatus.normalized === cleanHandle) {
      return asyncStatus;
    }
    return {
      checking: true,
      available: null,
      message: null,
      normalized: cleanHandle,
    };
  }, [cleanHandle, isCurrentHandle, valResult, asyncStatus]);

  // Debounced username availability check
  useEffect(() => {
    if (!cleanHandle || isCurrentHandle || (valResult && !valResult.isValid)) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(cleanHandle, user?.id);
      if (isMounted) {
        setAsyncStatus({
          checking: false,
          available: res.isAvailable,
          message: res.isAvailable
            ? `@${res.normalized} is available`
            : (res.error || 'This handle is already taken.'),
          normalized: res.normalized,
        });
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanHandle, isCurrentHandle, valResult?.isValid, user?.id]);

  const handlePickAvatar = async () => {
    if (!user?.id) return;
    const res = await pickAvatarImage();
    if (res.cancelled || !res.asset) return;

    setIsUploadingAvatar(true);
    const uploadRes = await uploadProfileAvatar(user.id, res.asset);
    setIsUploadingAvatar(false);

    if (uploadRes.success && uploadRes.url) {
      setAvatarUrl(uploadRes.url);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      Alert.alert('Photo Upload Failed', uploadRes.error || 'Could not upload photo.');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    setIsUploadingAvatar(true);
    const res = await removeProfileAvatar(user.id);
    setIsUploadingAvatar(false);

    if (res.success) {
      setAvatarUrl('');
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    } else {
      Alert.alert('Remove Failed', res.error || 'Could not remove photo.');
    }
  };

  const handlePickBanner = async () => {
    if (!user?.id) return;
    const res = await pickBannerImage();
    if (res.cancelled || !res.asset) return;

    setIsUploadingBanner(true);
    const uploadRes = await uploadProfileBanner(user.id, res.asset);
    setIsUploadingBanner(false);

    if (uploadRes.success && uploadRes.url) {
      setBannerUrl(uploadRes.url);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      Alert.alert('Banner Upload Failed', uploadRes.error || 'Could not upload banner.');
    }
  };

  const handleRemoveBanner = async () => {
    if (!user?.id) return;
    setIsUploadingBanner(true);
    const res = await removeProfileBanner(user.id);
    setIsUploadingBanner(false);

    if (res.success) {
      setBannerUrl('');
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    } else {
      Alert.alert('Remove Failed', res.error || 'Could not remove banner.');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name cannot be empty.');
      return;
    }

    const cleanHandle = normalizeHandle(handle);
    const val = validateUsername(cleanHandle);
    if (!val.isValid) {
      Alert.alert('Invalid Handle', val.error || 'Please enter a valid researcher handle.');
      return;
    }

    if (handleStatus.checking) {
      Alert.alert('Please wait', 'Still checking handle availability...');
      return;
    }

    if (handleStatus.available === false) {
      Alert.alert('Handle Unavailable', handleStatus.message || 'This handle is not available.');
      return;
    }

    setIsSaving(true);
    const parsedInterests = researchInterestsInput
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const updates = {
      avatarUrl: avatarUrl.trim() || undefined,
      bannerUrl: bannerUrl.trim() || undefined,
      hasCustomAvatar: true,
      hasCustomBanner: true,
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

    const res = await updateProfile(updates);

    setIsSaving(false);

    if (!res.success) {
      Alert.alert('Unable to Save Profile', res.error || 'Failed to update profile. Please try again.');
      return;
    }

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
        title="Edit Profile"
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
          {/* Header Subtitle */}
          <Text style={styles.pageSubtitle}>
            Manage your public academic identity, banner, and photo.
          </Text>

          {/* Section 1: PROFILE MEDIA & HEADER */}
          <Text style={styles.sectionHeaderTitle}>PROFILE MEDIA & HEADER</Text>
          <View style={styles.cardContainer}>
            {/* Cover Banner Image */}
            <View style={styles.mediaItemBlock}>
              <Text style={styles.mediaItemTitle}>Cover Banner Image</Text>
              <Text style={styles.mediaItemSubtitle}>
                Panoramic header displayed on your public researcher profile (3:1, max 5MB).
              </Text>

              {/* Banner Preview Box */}
              <View style={styles.bannerPreviewWrapper}>
                <Image
                  source={{ uri: bannerUrl || DEFAULT_BANNER_FALLBACK }}
                  style={styles.bannerPreviewImage}
                  contentFit="cover"
                />
                {isUploadingBanner && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.uploadingText}>Uploading Banner...</Text>
                  </View>
                )}
              </View>

              {/* Banner Buttons Row */}
              <View style={styles.mediaActionsRow}>
                <TouchableOpacity
                  onPress={handlePickBanner}
                  disabled={isUploadingBanner}
                  style={styles.pillButtonPrimary}
                  activeOpacity={0.7}
                >
                  <Camera size={14} color={colors.textPrimary} />
                  <Text style={styles.pillButtonPrimaryText}>
                    {bannerUrl ? 'Change Banner' : 'Upload Banner'}
                  </Text>
                </TouchableOpacity>

                {bannerUrl ? (
                  <TouchableOpacity
                    onPress={handleRemoveBanner}
                    disabled={isUploadingBanner}
                    style={styles.pillButtonSecondary}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pillButtonSecondaryText}>Remove Banner</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Separator Divider */}
            <View style={styles.cardDivider} />

            {/* Profile Avatar / Headshot */}
            <View style={styles.mediaItemBlock}>
              <Text style={styles.mediaItemTitle}>Profile Avatar / Headshot</Text>
              <Text style={styles.mediaItemSubtitle}>
                Square headshot displayed across discussions and citations (1:1, max 5MB).
              </Text>

              <View style={styles.avatarControlsRow}>
                {/* Circular Avatar Preview */}
                <View style={styles.avatarPreviewWrapper}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarPreviewImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {(fullName || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {isUploadingAvatar && (
                    <View style={styles.avatarUploadingOverlay}>
                      <ActivityIndicator size="small" color={colors.white} />
                    </View>
                  )}
                </View>

                {/* Avatar Action Buttons */}
                <View style={styles.avatarButtonsContainer}>
                  <TouchableOpacity
                    onPress={handlePickAvatar}
                    disabled={isUploadingAvatar}
                    style={styles.pillButtonPrimary}
                    activeOpacity={0.7}
                  >
                    <Upload size={14} color={colors.textPrimary} />
                    <Text style={styles.pillButtonPrimaryText}>
                      {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </Text>
                  </TouchableOpacity>

                  {avatarUrl ? (
                    <TouchableOpacity
                      onPress={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      style={styles.pillButtonSecondary}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pillButtonSecondaryText}>Remove Photo</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {/* Section 2: BASIC IDENTITY */}
          <Text style={styles.sectionHeaderTitle}>BASIC IDENTITY</Text>
          <View style={styles.cardContainer}>
            {/* Full Name */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <View style={styles.inputWithIconContainer}>
                <User size={16} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.fieldInputClean}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Sagar Yadav or Dr. Jane Doe"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Username / Handle */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Username / Handle *</Text>
              <View style={styles.inputWithIconContainer}>
                <Text style={styles.handlePrefixText}>@</Text>
                <TextInput
                  style={styles.fieldInputClean}
                  value={handle}
                  onChangeText={setHandle}
                  placeholder="username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Real-time availability indicator */}
              {handle.trim().length > 0 && (
                <View style={styles.availabilityRow}>
                  {handleStatus.checking ? (
                    <>
                      <ActivityIndicator size="small" color={colors.accentBlue} />
                      <Text style={styles.availabilityCheckingText}>
                        Checking @{handleStatus.normalized} availability...
                      </Text>
                    </>
                  ) : handleStatus.available === true ? (
                    <>
                      <CheckCircle2 size={14} color="#16a34a" />
                      <Text style={styles.availabilitySuccessText}>
                        ✓ {handleStatus.message}
                      </Text>
                    </>
                  ) : handleStatus.available === false ? (
                    <>
                      <AlertCircle size={14} color={colors.accentRed} />
                      <Text style={styles.availabilityErrorText}>
                        ✕ {handleStatus.message}
                      </Text>
                    </>
                  ) : null}
                </View>
              )}
            </View>

            {/* Academic Role / Status */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Academic Role / Status</Text>
              <View style={styles.inputWithIconContainer}>
                <GraduationCap size={16} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.fieldInputClean}
                  value={academicTitle}
                  onChangeText={setAcademicTitle}
                  placeholder="e.g. Student researcher, PhD Candidate, Professor"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Text style={styles.fieldHint}>
                Students, independent researchers, and enthusiasts are equally welcome.
              </Text>
            </View>

            {/* Institution / Organization */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Institution / Organization</Text>
              <View style={styles.inputWithIconContainer}>
                <Building size={16} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.fieldInputClean}
                  value={institution}
                  onChangeText={setInstitution}
                  placeholder="e.g. Independent Researcher / MIT / Delhi University"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Bio & Research Summary */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Bio & Research Summary</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textAreaInput}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  placeholder="I am a neuroscience student interested in AI and biology..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Section 3: RESEARCH & ACADEMIC DETAILS */}
          <Text style={styles.sectionHeaderTitle}>RESEARCH & ACADEMIC DETAILS</Text>
          <View style={styles.cardContainer}>
            {/* Country & Location */}
            <View style={styles.rowInputs}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Country</Text>
                <View style={styles.inputWithIconContainer}>
                  <Globe size={15} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                  <TextInput
                    style={styles.fieldInputClean}
                    value={country}
                    onChangeText={setCountry}
                    placeholder="e.g. India"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>City / Location</Text>
                <View style={styles.inputWithIconContainer}>
                  <MapPin size={15} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                  <TextInput
                    style={styles.fieldInputClean}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. New Delhi"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Research Interests */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Research Interests (Comma separated)</Text>
              <View style={styles.inputWithIconContainer}>
                <Tag size={15} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.fieldInputClean}
                  value={researchInterestsInput}
                  onChangeText={setResearchInterestsInput}
                  placeholder="e.g. Neuroscience, AI & Bio, Genetics"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Text style={styles.fieldHint}>
                These topics will also configure your customized top feed tabs on the home screen.
              </Text>
            </View>

            {/* ORCID iD */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithBadge}>
                <Text style={styles.fieldLabel}>ORCID iD</Text>
                <Text style={styles.orcidBadge}>Verified Researcher</Text>
              </View>
              <View style={styles.inputWithIconContainer}>
                <ExternalLink size={15} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.fieldInputClean}
                  value={orcidId}
                  onChangeText={setOrcidId}
                  placeholder="0000-0002-8140-5231"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.fieldHint}>
                Linking your ORCID grants the green verified badge and connects your published DOI record.
              </Text>
            </View>

            {/* Website URL */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Personal Website / Lab Page</Text>
              <View style={styles.inputWithIconContainer}>
                <Globe size={15} color={colors.textSecondary} style={styles.fieldLeftIcon} />
                <TextInput
                  style={styles.fieldInputClean}
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://yourwebsite.edu"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>
          </View>

          {/* Bottom Save Changes Button */}
          <View style={styles.bottomButtonContainer}>
            <Button
              title={isSaving ? 'Saving Changes...' : 'Save Changes'}
              variant="primary"
              size="lg"
              onPress={handleSave}
              disabled={isSaving}
              style={styles.saveSubmitButton}
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
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: spacing.xxxl * 2,
  },
  saveHeaderButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  saveHeaderText: {
    ...typography.captionBold,
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  pageSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeaderTitle: {
    ...typography.captionBold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs + 2,
    textTransform: 'uppercase',
  },
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      },
      default: {
        elevation: 1,
      },
    }),
  },
  mediaItemBlock: {
    gap: 4,
  },
  mediaItemTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mediaItemSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  bannerPreviewWrapper: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  bannerPreviewImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 10,
  },
  uploadingText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 13,
  },
  mediaActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 10,
  },
  pillButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillButtonPrimaryText: {
    ...typography.captionBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pillButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillButtonSecondaryText: {
    ...typography.captionBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  avatarControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  avatarPreviewWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    ...typography.h3,
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  formGroup: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.captionBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orcidBadge: {
    ...typography.micro,
    color: '#16a34a',
    fontWeight: '700',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  inputWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  fieldLeftIcon: {
    marginRight: 8,
  },
  handlePrefixText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginRight: 4,
    fontSize: 15,
  },
  fieldInputClean: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  textAreaContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 88,
  },
  textAreaInput: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 70,
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
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  availabilityCheckingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  availabilitySuccessText: {
    ...typography.captionBold,
    color: '#16a34a',
    fontSize: 12,
  },
  availabilityErrorText: {
    ...typography.captionBold,
    color: colors.accentRed,
    fontSize: 12,
  },
  bottomButtonContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  saveSubmitButton: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
});

