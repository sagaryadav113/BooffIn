import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Sparkles,
  BookOpen,
  PenTool,
  Users,
  MessageSquare,
  Headphones,
  Image as ImageIcon,
  AlignLeft,
  Building2,
  Camera,
  CheckCircle2,
  ShieldAlert,
  Rocket,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Input } from '../../components/core/Input';
import { SelectDropdown } from '../../components/core/SelectDropdown';
import { useAuthStore } from '../../store/useAuthStore';
import {
  validateUsername,
  checkUsernameAvailability,
  normalizeHandle,
} from '../../api/authService';
import { pickAvatarImage, uploadProfileAvatar } from '../../api/storageService';

const BOOFFIN_LOGO = require('../../../assets/images/booffin-symbol.png');

// Modalities for Page 2: "Tell us more about what you like" (Reference 2)
const CONTENT_MODALITIES = [
  {
    id: 'reading_preprints',
    label: 'Reading Papers',
    desc: 'Preprints, arXiv, bioRxiv',
    icon: BookOpen,
  },
  {
    id: 'creating_publishing',
    label: 'Publishing Research',
    desc: 'Share preprints & notes',
    icon: PenTool,
  },
  {
    id: 'connecting_scholars',
    label: 'Connecting Scholars',
    desc: 'Find collaborators & labs',
    icon: Users,
  },
  {
    id: 'academic_discussions',
    label: 'Discussions & Review',
    desc: 'Post review & critiques',
    icon: MessageSquare,
  },
  {
    id: 'scholar_audio',
    label: 'Podcasts & Audio',
    desc: 'Talks & audio summaries',
    icon: Headphones,
  },
  {
    id: 'figure_galleries',
    label: 'Data & Figures',
    desc: 'Charts & dataset figures',
    icon: ImageIcon,
  },
  {
    id: 'short_posts',
    label: 'Short Posts',
    desc: 'Quick discoveries & updates',
    icon: AlignLeft,
  },
  {
    id: 'institutional_circles',
    label: 'Lab Circles',
    desc: 'Department & group chats',
    icon: Building2,
  },
];

// Curated academic disciplines for Page 3: "Select 3 topics" (Reference 3)
const CURATED_TOPICS = [
  'Computer Science',
  'Artificial Intelligence',
  'Neuroscience',
  'Biology',
  'Physics',
  'Medicine',
  'Mathematics',
  'Economics',
  'Philosophy',
  'Bioengineering',
  'Psychology',
  'Chemistry',
  'Social Sciences',
  'Quantum Computing',
  'Environmental Science',
  'Astronomy',
  'Genetics & Genomics',
  'Data Science',
  'Linguistics',
  'Materials Science',
];

// Dropdown options for Step 4
const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const AGE_OPTIONS = [
  { label: 'Under 13', value: 'under_13', subtitle: 'Restricted under COPPA' },
  { label: '13–17 (Under 18)', value: '13_17' },
  { label: '18–24', value: '18_24' },
  { label: '25–34', value: '25_34' },
  { label: '35–44', value: '35_44' },
  { label: '45+', value: '45_plus' },
];

const REFERRAL_OPTIONS = [
  { label: 'Academic Colleague / Peer', value: 'colleague' },
  { label: 'Twitter / X', value: 'twitter' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Conference / Academic Workshop', value: 'conference' },
  { label: 'Google / Web Search', value: 'search' },
  { label: 'University / Department', value: 'university' },
  { label: 'Other', value: 'other' },
];

export default function OnboardingScreen() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  // Steps correspond to Pages 2-5 of the 5-step flow:
  // 1 = What you like (Page 2)
  // 2 = Select 3 topics (Page 3)
  // 3 = Tell us about yourself (Page 4)
  // 4 = Let's BooffIn! (Page 5)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);

  // --- Step 1 State: Content Preferences ---
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([
    'reading_preprints',
    'academic_discussions',
  ]);

  // --- Step 2 State: Curated Topics ---
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    Array.isArray(user?.researchInterests) ? user.researchInterests : []
  );

  // --- Step 3 State: Profile Details, Demographics & Referral ---
  const initialName =
    user?.fullName && user.fullName.toLowerCase() !== 'researcher' ? user.fullName : '';
  const [fullName, setFullName] = useState(initialName);
  const [handle, setHandle] = useState('');
  const [academicTitle, setAcademicTitle] = useState(user?.academicTitle || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [gender, setGender] = useState<string | null>(user?.gender || null);
  const [ageBracket, setAgeBracket] = useState<string | null>(user?.ageBracket || null);
  const [referralSource, setReferralSource] = useState<string | null>(user?.referralSource || null);
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Validation & Safety States
  const [stepError, setStepError] = useState<string | null>(null);
  const [showCoppaBlockModal, setShowCoppaBlockModal] = useState(false);

  // Async handle check state
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
  const valResult = cleanHandle ? validateUsername(cleanHandle) : null;

  const handleStatus = useMemo(() => {
    if (!cleanHandle) {
      return { checking: false, available: null, message: null, normalized: '' };
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
      message: 'Checking handle availability...',
      normalized: cleanHandle,
    };
  }, [cleanHandle, valResult, asyncStatus]);

  // Debounced live handle check
  React.useEffect(() => {
    if (!cleanHandle || (valResult && !valResult.isValid)) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setAsyncStatus({
        checking: true,
        available: null,
        message: 'Checking...',
        normalized: cleanHandle,
      });

      const res = await checkUsernameAvailability(cleanHandle, user?.id);

      if (isMounted) {
        setAsyncStatus({
          checking: false,
          available: res.isAvailable,
          message: res.error,
          normalized: cleanHandle,
        });
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanHandle, valResult?.isValid, user?.id]);

  // Toggle content preference card
  const togglePreference = (prefId: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (selectedPreferences.includes(prefId)) {
      setSelectedPreferences(selectedPreferences.filter((p) => p !== prefId));
    } else {
      setSelectedPreferences([...selectedPreferences, prefId]);
    }
  };

  // Toggle research topic chip
  const toggleTopic = (topic: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Avatar picker handler
  const handlePickAvatar = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const res = await pickAvatarImage();
    if (res.cancelled || !res.asset) return;

    setAvatarUri(res.asset.uri);

    if (user?.id) {
      setIsUploadingAvatar(true);
      const uploadRes = await uploadProfileAvatar(user.id, res.asset);
      setIsUploadingAvatar(false);
      if (uploadRes.success && uploadRes.url) {
        setAvatarUri(uploadRes.url);
      }
    }
  };

  // Step 3 -> 4 Validation
  const handleValidateStep3 = async () => {
    setStepError(null);
    const cleanName = fullName.trim();

    if (!cleanName) {
      setStepError('Please enter your full name.');
      return;
    }

    if (!cleanHandle) {
      setStepError('Please choose a username handle.');
      return;
    }

    if (!valResult?.isValid) {
      setStepError(valResult?.error || 'Invalid username.');
      return;
    }

    if (handleStatus.available === false) {
      setStepError(handleStatus.message || 'This username is already taken.');
      return;
    }

    // Safety validation: Age Range is required
    if (!ageBracket) {
      setStepError('Please select your age range for safety and legal compliance.');
      return;
    }

    // Legal Gate: Block Under 13 (COPPA)
    if (ageBracket === 'under_13') {
      setShowCoppaBlockModal(true);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setStep(4);
  };

  // Final step: Save profile and launch into BooffIn feed
  const handleFinalLaunch = async () => {
    setIsSaving(true);
    setStepError(null);

    const updatedData = {
      fullName: fullName.trim(),
      handle: normalizeHandle(handle),
      academicTitle: academicTitle.trim() || 'Academic Researcher',
      institution: institution.trim() || 'Independent Scholar',
      gender: (gender as any) || null,
      ageBracket: (ageBracket as any) || null,
      referralSource: referralSource || null,
      contentPreferences: selectedPreferences,
      researchInterests: selectedTopics.length > 0 ? selectedTopics : ['General Science'],
      bio: bio.trim(),
      avatarUrl: avatarUri || undefined,
    };

    const res = await updateProfile(updatedData);

    if (!res.success) {
      setIsSaving(false);
      setStep(3);
      setStepError(res.error || 'Failed to save profile. Please check your username.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setTimeout(() => {
      setIsSaving(false);
      router.replace('/(tabs)');
    }, 200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.wrapper}>
          {/* Top Navigation Row */}
          <View style={styles.headerRow}>
            {step > 1 && step < 4 && (
              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setStep((prev) => (prev - 1) as any);
                }}
                style={styles.backButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.2} />
              </TouchableOpacity>
            )}

            {/* Step Progress Dots */}
            <View style={styles.progressDotsContainer}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.progressDot,
                    step === s && styles.progressDotActive,
                    step > s && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* ============================================================ */}
          {/* STEP 1 (Page 2 overall): Tell us more about what you like   */}
          {/* ============================================================ */}
          {step === 1 && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentHeader}>
                <View style={styles.logoBadge}>
                  <Image source={BOOFFIN_LOGO} style={styles.logoIcon} resizeMode="contain" />
                </View>
                <Text style={styles.pageTitle}>Tell us more about what you like</Text>
                <Text style={styles.pageSubtitle}>
                  Choose all that apply to personalize your scientific feed.
                </Text>
              </View>

              {/* 2-Column Modality Cards */}
              <View style={styles.gridContainer}>
                {CONTENT_MODALITIES.map((mod) => {
                  const isSelected = selectedPreferences.includes(mod.id);
                  const IconComp = mod.icon;
                  return (
                    <TouchableOpacity
                      key={mod.id}
                      style={[
                        styles.gridCard,
                        isSelected && styles.gridCardSelected,
                      ]}
                      onPress={() => togglePreference(mod.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.gridCardHeader}>
                        <View
                          style={[
                            styles.iconCircle,
                            isSelected && styles.iconCircleSelected,
                          ]}
                        >
                          <IconComp
                            size={18}
                            color={isSelected ? '#F97316' : '#4B5563'}
                            strokeWidth={2}
                          />
                        </View>
                        {isSelected && (
                          <View style={styles.checkPill}>
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.gridCardTitle,
                          isSelected && styles.gridCardTitleSelected,
                        ]}
                      >
                        {mod.label}
                      </Text>
                      <Text style={styles.gridCardDesc}>{mod.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setStep(2);
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ============================================================ */}
          {/* STEP 2 (Page 3 overall): Select 3 topics                    */}
          {/* ============================================================ */}
          {step === 2 && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentHeader}>
                <View style={styles.logoBadge}>
                  <Image source={BOOFFIN_LOGO} style={styles.logoIcon} resizeMode="contain" />
                </View>
                <Text style={styles.pageTitle}>Select 3 topics</Text>
                <Text style={styles.pageSubtitle}>
                  We'll recommend papers, preprints, and researchers that fit your interests.
                </Text>
              </View>

              {/* Topic Chips Container */}
              <View style={styles.topicsWrapper}>
                <View style={styles.chipsContainer}>
                  {CURATED_TOPICS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <TouchableOpacity
                        key={topic}
                        onPress={() => toggleTopic(topic)}
                        style={[
                          styles.topicChip,
                          isSelected && styles.topicChipSelected,
                        ]}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.topicChipText,
                            isSelected && styles.topicChipTextSelected,
                          ]}
                        >
                          {topic}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bottom Action with Dynamic Counter Button */}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    selectedTopics.length < 3 && styles.primaryButtonDisabled,
                  ]}
                  disabled={selectedTopics.length < 3}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setStep(3);
                  }}
                  activeOpacity={0.88}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      selectedTopics.length < 3 && styles.primaryButtonTextDisabled,
                    ]}
                  >
                    {selectedTopics.length === 0
                      ? 'Select 3 more to continue'
                      : selectedTopics.length < 3
                      ? `Select ${3 - selectedTopics.length} more to continue`
                      : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ============================================================ */}
          {/* STEP 3 (Page 4 overall): Tell us about yourself             */}
          {/* ============================================================ */}
          {step === 3 && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.contentHeader}>
                <View style={styles.logoBadge}>
                  <Image source={BOOFFIN_LOGO} style={styles.logoIcon} resizeMode="contain" />
                </View>
                <Text style={styles.pageTitle}>Tell us about yourself</Text>
                <Text style={styles.pageSubtitle}>
                  Add your name, a profile picture, and a bit more about who you are.
                </Text>
              </View>

              {/* Avatar Uploader */}
              <View style={styles.avatarRow}>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={handlePickAvatar}
                  activeOpacity={0.85}
                  disabled={isUploadingAvatar}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Camera size={26} color="#6B7280" />
                    </View>
                  )}
                  <View style={styles.avatarEditBadge}>
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <PenTool size={12} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Error Banner */}
              {stepError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={15} color={colors.accentRed} style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{stepError}</Text>
                </View>
              )}

              {/* Name */}
              <Input
                label="Name *"
                placeholder="Type your name..."
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (stepError) setStepError(null);
                }}
              />

              {/* Handle */}
              <Input
                label="Username / Handle *"
                placeholder="Choose a username..."
                value={handle}
                onChangeText={(text) => {
                  setHandle(text);
                  if (stepError) setStepError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                hint={
                  cleanHandle && handleStatus.available === true
                    ? '✓ Available username'
                    : cleanHandle && handleStatus.available === false
                    ? handleStatus.message || 'Already taken'
                    : 'Lowercase letters, numbers, and underscores (3-30 chars)'
                }
                error={cleanHandle && handleStatus.available === false ? (handleStatus.message || 'Username taken') : undefined}
              />

              {/* Academic Title */}
              <Input
                label="Academic Title or Role"
                placeholder="e.g. PhD Candidate, Neuroscientist, Student"
                value={academicTitle}
                onChangeText={setAcademicTitle}
              />

              {/* Institution */}
              <Input
                label="Institution or University"
                placeholder="e.g. MIT, Stanford University, Independent"
                value={institution}
                onChangeText={setInstitution}
              />

              {/* Gender Dropdown (Optional for safety) */}
              <SelectDropdown
                label="Gender (Optional - for safety)"
                placeholder="Select gender..."
                value={gender}
                options={GENDER_OPTIONS}
                onSelect={(val) => setGender(val)}
                hint="Used strictly for community safety and aggregate demographics."
              />

              {/* Age Range Dropdown (Required for compliance) */}
              <SelectDropdown
                label="Age Range (Required for safety) *"
                placeholder="Select age range..."
                value={ageBracket}
                options={AGE_OPTIONS}
                onSelect={(val) => {
                  setAgeBracket(val);
                  if (val === 'under_13') {
                    setShowCoppaBlockModal(true);
                  }
                  if (stepError) setStepError(null);
                }}
                error={ageBracket === 'under_13' ? 'Registration restricted: Must be 13 or older under COPPA' : undefined}
              />

              {/* Where did you hear about us? */}
              <SelectDropdown
                label="Where did you hear about us?"
                placeholder="Select source..."
                value={referralSource}
                options={REFERRAL_OPTIONS}
                onSelect={(val) => setReferralSource(val)}
              />

              {/* Bio */}
              <Input
                label="Bio (Optional)"
                placeholder="Say something about yourself or your research interests..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />

              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    ageBracket === 'under_13' && styles.primaryButtonDisabled,
                  ]}
                  disabled={ageBracket === 'under_13'}
                  onPress={handleValidateStep3}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ============================================================ */}
          {/* STEP 4 (Page 5 overall): Let's BooffIn!                      */}
          {/* ============================================================ */}
          {step === 4 && (
            <View style={styles.celebrationContainer}>
              <View style={styles.celebrationContent}>
                {/* Visual Milestone Badge */}
                <View style={styles.milestoneCircle}>
                  <Rocket size={44} color="#F97316" strokeWidth={1.8} />
                </View>

                <Text style={styles.celebrationTitle}>You're all set!</Text>
                <Text style={styles.celebrationSubtitle}>
                  Welcome to BooffIn. Next, head to your feed to explore preprints and start scholarly discussions.
                </Text>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text style={styles.summaryText}>
                      Profile ready: <Text style={styles.summaryBold}>@{normalizeHandle(handle)}</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text style={styles.summaryText}>
                      Topics tailored: <Text style={styles.summaryBold}>{selectedTopics.length} fields selected</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text style={styles.summaryText}>Community safety & verification configured</Text>
                  </View>
                </View>
              </View>

              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleFinalLaunch}
                  disabled={isSaving}
                  activeOpacity={0.88}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Let's BooffIn! →</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* COPPA Age-Gate Legal Block Modal                            */}
          {/* ============================================================ */}
          <Modal
            visible={showCoppaBlockModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCoppaBlockModal(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={styles.modalIconCircle}>
                  <ShieldAlert size={32} color="#DC2626" />
                </View>
                <Text style={styles.modalTitle}>Account Creation Restricted</Text>
                <Text style={styles.modalMessage}>
                  In compliance with the Children's Online Privacy Protection Act (COPPA) and international digital safety regulations, BooffIn accounts cannot be created for users under 13 years old.
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowCoppaBlockModal(false);
                    setAgeBracket(null);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalButtonText}>I Made a Mistake (Change Age)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    height: 48,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    borderRadius: radii.full,
  },
  progressDotsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    width: 22,
    backgroundColor: '#F97316',
  },
  progressDotCompleted: {
    backgroundColor: '#FDBA74',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'web' ? spacing.xxxl : spacing.xl,
  },
  contentHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: spacing.md,
  },
  logoIcon: {
    width: 26,
    height: 26,
  },
  pageTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 26,
    color: '#111827',
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
  },
  // Step 1: Modality Grid Cards
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  gridCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
    borderWidth: 1.5,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconCircleSelected: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFFFF',
  },
  checkPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  gridCardTitleSelected: {
    color: '#C2410C',
  },
  gridCardDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },
  // Step 2: Topic Chips
  topicsWrapper: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  topicChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
  },
  topicChipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  topicChipText: {
    fontSize: 13,
    color: '#374151',
  },
  topicChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Step 3: Avatar & Inputs
  avatarRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarButton: {
    position: 'relative',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  // Bottom action bar
  bottomBar: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
    color: '#9CA3AF',
  },
  // Step 4: Celebration
  celebrationContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'web' ? spacing.xxxl : spacing.xl,
    paddingTop: spacing.xxl,
  },
  celebrationContent: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  milestoneCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  celebrationTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 30,
    color: '#111827',
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: spacing.xxl,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryText: {
    fontSize: 13,
    color: '#4B5563',
  },
  summaryBold: {
    color: '#111827',
    fontWeight: '600',
  },
  // Modal for COPPA block
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalMessage: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalButton: {
    width: '100%',
    height: 46,
    borderRadius: radii.md,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
