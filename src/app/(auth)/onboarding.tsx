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
  TextInput,
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
  Search,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Input } from '../../components/core/Input';
import { SelectDropdown } from '../../components/core/SelectDropdown';
import { BooffinLogo } from '../../components/core/BooffinLogo';
import { useAuthStore } from '../../store/useAuthStore';
import {
  validateUsername,
  checkUsernameAvailability,
  normalizeHandle,
} from '../../api/authService';
import { pickAvatarImage, uploadProfileAvatar } from '../../api/storageService';
import { searchResearchTaxonomy } from '../../data/researchTaxonomy';

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

export const ACADEMIC_ROLE_OPTIONS = [
  { label: 'PhD Scholar / Candidate', value: 'PhD Scholar' },
  { label: 'Postdoctoral Researcher', value: 'Postdoctoral Researcher' },
  { label: 'Professor / Faculty', value: 'Professor' },
  { label: 'Research Scientist', value: 'Research Scientist' },
  { label: 'Research Assistant', value: 'Research Assistant' },
  { label: "Master's Student", value: "Master's Student" },
  { label: 'Undergraduate Researcher', value: 'Undergraduate Researcher' },
  { label: 'Industry Researcher / R&D', value: 'Industry Researcher' },
  { label: 'Independent Researcher', value: 'Independent Researcher' },
  { label: 'Other Academic Title', value: 'Other' },
];

function generateFallbackAvatar(seed: string): string {
  const cleanSeed = seed.trim() || 'Scholar';
  return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(cleanSeed)}&backgroundColor=064e3b,047857&textColor=ffffff`;
}

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

  // --- Step 2 State: Curated Topics & 1,200+ Taxonomy Search ---
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    Array.isArray(user?.researchInterests) ? user.researchInterests.slice(0, 4) : []
  );
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [topicsLimitWarning, setTopicsLimitWarning] = useState<string | null>(null);

  // Live searched taxonomy items from 1,200+ fields
  const taxonomySearchResults = useMemo(() => {
    if (!topicSearchQuery.trim()) return [];
    return searchResearchTaxonomy(topicSearchQuery.trim(), 25);
  }, [topicSearchQuery]);

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

  // Auto-fetch profile picture from Google account, or generate a tailored avatar based on user's email/name
  const hasGoogleAvatar = Boolean(user?.avatarUrl && !user.avatarUrl.includes('dicebear.com'));
  const [hasCustomAvatar, setHasCustomAvatar] = useState<boolean>(hasGoogleAvatar);
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatarUrl || generateFallbackAvatar(initialName || user?.email?.split('@')[0] || 'Scholar')
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Sync avatar if user account details rehydrate from Google OAuth
  React.useEffect(() => {
    if (user?.avatarUrl && !hasCustomAvatar) {
      setAvatarUri(user.avatarUrl);
      setHasCustomAvatar(true);
    }
  }, [user?.avatarUrl]);

  const handleNameChange = (text: string) => {
    setFullName(text);
    if (stepError) setStepError(null);
    if (!hasCustomAvatar) {
      setAvatarUri(generateFallbackAvatar(text || user?.email?.split('@')[0] || 'Scholar'));
    }
  };

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

  // Toggle research topic chip with min 2, max 4 constraints
  const toggleTopic = (topic: string) => {
    const cleanTopic = topic.trim();
    const isSelected = selectedTopics.some((t) => t.toLowerCase() === cleanTopic.toLowerCase());

    if (isSelected) {
      try {
        Haptics.selectionAsync();
      } catch {}
      setTopicsLimitWarning(null);
      setSelectedTopics((prev) => prev.filter((t) => t.toLowerCase() !== cleanTopic.toLowerCase()));
    } else {
      if (selectedTopics.length >= 4) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
        setTopicsLimitWarning('You can select a maximum of 4 topics.');
        return;
      }
      try {
        Haptics.selectionAsync();
      } catch {}
      setTopicsLimitWarning(null);
      setSelectedTopics((prev) => [...prev, cleanTopic]);
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
    setHasCustomAvatar(true);

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
                <View style={styles.logoRow}>
                  <BooffinLogo size={46} variant="symbol" />
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
                            color={isSelected ? '#064E3B' : '#4B5563'}
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
          {/* STEP 2 (Page 3 overall): Select 2 to 4 topics               */}
          {/* ============================================================ */}
          {step === 2 && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.contentHeader}>
                <View style={styles.logoRow}>
                  <BooffinLogo size={46} variant="symbol" />
                </View>
                <Text style={styles.pageTitle}>Select 2 to 4 topics</Text>
                <Text style={styles.pageSubtitle}>
                  Choose between 2 and 4 research fields to personalize your home feed, preprint alerts, and recommendations.
                </Text>

                {/* Counter & Status Badge */}
                <View style={styles.topicSelectionCounterRow}>
                  <View
                    style={[
                      styles.selectionCounterPill,
                      selectedTopics.length >= 2 && selectedTopics.length <= 4
                        ? styles.selectionCounterPillValid
                        : styles.selectionCounterPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectionCounterPillText,
                        selectedTopics.length >= 2 && selectedTopics.length <= 4
                          ? styles.selectionCounterPillTextValid
                          : styles.selectionCounterPillTextPending,
                      ]}
                    >
                      {selectedTopics.length}/4 selected {selectedTopics.length < 2 ? '(min. 2 required)' : '✓'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Warning if user attempted to select more than 4 */}
              {topicsLimitWarning && (
                <View style={styles.topicWarningBanner}>
                  <AlertCircle size={15} color="#B45309" style={{ marginRight: 6 }} />
                  <Text style={styles.topicWarningText}>{topicsLimitWarning}</Text>
                </View>
              )}

              {/* Selected Topics Tray */}
              {selectedTopics.length > 0 && (
                <View style={styles.selectedTopicsTray}>
                  <Text style={styles.sectionSubHeader}>YOUR SELECTIONS ({selectedTopics.length}/4)</Text>
                  <View style={styles.selectedChipsWrap}>
                    {selectedTopics.map((topic) => (
                      <TouchableOpacity
                        key={topic}
                        onPress={() => toggleTopic(topic)}
                        style={styles.selectedTopicBadge}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.selectedTopicBadgeText}>{topic}</Text>
                        <X size={12} color="#FFFFFF" strokeWidth={2.8} style={{ marginLeft: 5 }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Popular Fields Section */}
              <View style={styles.topicsWrapper}>
                <Text style={styles.sectionSubHeader}>POPULAR FIELDS</Text>
                <View style={styles.chipsContainer}>
                  {CURATED_TOPICS.map((topic) => {
                    const isSelected = selectedTopics.some(
                      (t) => t.toLowerCase() === topic.toLowerCase()
                    );
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
                        {isSelected && (
                          <Check size={12} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 5 }} />
                        )}
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

              {/* Search 1,200+ Fields Section */}
              <View style={styles.searchTaxonomyWrapper}>
                <Text style={styles.sectionSubHeader}>SEARCH 1,200+ FIELDS & SPECIALTIES</Text>
                <View style={styles.taxonomySearchBar}>
                  <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.taxonomySearchInput}
                    placeholder="Search subfields, disciplines, or topics..."
                    placeholderTextColor="#94A3B8"
                    value={topicSearchQuery}
                    onChangeText={(text) => {
                      setTopicSearchQuery(text);
                      if (topicsLimitWarning) setTopicsLimitWarning(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {topicSearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setTopicSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Search Results Display */}
                {topicSearchQuery.trim().length > 0 && (
                  <View style={styles.searchResultsContainer}>
                    {taxonomySearchResults.length > 0 ? (
                      <View style={styles.searchResultsList}>
                        {taxonomySearchResults.map((item) => {
                          const isSelected = selectedTopics.some(
                            (t) => t.toLowerCase() === item.name.toLowerCase()
                          );
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.searchResultRow,
                                isSelected && styles.searchResultRowSelected,
                              ]}
                              onPress={() => toggleTopic(item.name)}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.searchResultName,
                                    isSelected && styles.searchResultNameSelected,
                                  ]}
                                >
                                  {item.name}
                                </Text>
                                <Text style={styles.searchResultHierarchy}>
                                  {item.hierarchy || item.familyName}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.searchResultCheckPill,
                                  isSelected && styles.searchResultCheckPillSelected,
                                ]}
                              >
                                {isSelected ? (
                                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                ) : (
                                  <Text style={styles.searchResultAddText}>+</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.noResultsBox}>
                        <Text style={styles.noResultsText}>
                          No fields matching &quot;{topicSearchQuery}&quot;
                        </Text>
                        <Text style={styles.noResultsSubtext}>
                          Try searching by another discipline, subfield, or broader specialty.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Bottom Action with Dynamic Counter Button */}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (selectedTopics.length < 2 || selectedTopics.length > 4) &&
                      styles.primaryButtonDisabled,
                  ]}
                  disabled={selectedTopics.length < 2 || selectedTopics.length > 4}
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
                      (selectedTopics.length < 2 || selectedTopics.length > 4) &&
                        styles.primaryButtonTextDisabled,
                    ]}
                  >
                    {selectedTopics.length === 0
                      ? 'Select at least 2 topics to continue'
                      : selectedTopics.length === 1
                      ? 'Select 1 more to continue'
                      : `Continue (${selectedTopics.length}/4 selected)`}
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
                <View style={styles.logoRow}>
                  <BooffinLogo size={46} variant="symbol" />
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
                onChangeText={handleNameChange}
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

              {/* Academic Title or Role */}
              <SelectDropdown
                label="Academic Title or Role"
                placeholder="Select your academic role..."
                value={academicTitle}
                options={ACADEMIC_ROLE_OPTIONS}
                onSelect={(val) => setAcademicTitle(val)}
                sheetTitle="Select Academic Role"
              />

              {/* Institution or Affiliations */}
              <Input
                label="Institution or Affiliations"
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
                  <Rocket size={44} color="#064E3B" strokeWidth={1.8} />
                </View>

                <Text style={styles.celebrationTitle}>You're all set!</Text>
                <Text style={styles.celebrationSubtitle}>
                  Welcome to BooffIn. Next, head to your feed to explore preprints and start scholarly discussions.
                </Text>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <CheckCircle2 size={16} color="#064E3B" />
                    <Text style={styles.summaryText}>
                      Profile ready: <Text style={styles.summaryBold}>@{normalizeHandle(handle)}</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <CheckCircle2 size={16} color="#064E3B" />
                    <Text style={styles.summaryText}>
                      Topics tailored: <Text style={styles.summaryBold}>{selectedTopics.length} fields selected</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <CheckCircle2 size={16} color="#064E3B" />
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
    backgroundColor: '#064E3B',
  },
  progressDotCompleted: {
    backgroundColor: '#A7F3D0',
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
  logoRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
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
    backgroundColor: '#F0FDF4',
    borderColor: '#064E3B',
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
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
  },
  checkPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#064E3B',
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
    color: '#064E3B',
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
    backgroundColor: '#064E3B',
    borderColor: '#064E3B',
  },
  topicChipText: {
    fontSize: 13,
    color: '#374151',
  },
  topicChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topicSelectionCounterRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  selectionCounterPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  selectionCounterPillPending: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  selectionCounterPillValid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  selectionCounterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectionCounterPillTextPending: {
    color: '#6B7280',
  },
  selectionCounterPillTextValid: {
    color: '#065F46',
  },
  topicWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  topicWarningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  selectedTopicsTray: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionSubHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  selectedTopicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
  },
  selectedTopicBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchTaxonomyWrapper: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  taxonomySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    marginTop: spacing.xs,
  },
  taxonomySearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    height: '100%',
    padding: 0,
  },
  searchResultsContainer: {
    marginTop: spacing.sm,
    maxHeight: 220,
  },
  searchResultsList: {
    gap: 4,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  searchResultRowSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#064E3B',
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchResultNameSelected: {
    color: '#064E3B',
  },
  searchResultHierarchy: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  searchResultCheckPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchResultCheckPillSelected: {
    backgroundColor: '#064E3B',
  },
  searchResultAddText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    lineHeight: 16,
  },
  noResultsBox: {
    padding: spacing.md,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
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
    backgroundColor: '#064E3B',
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
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#064E3B',
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
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
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
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
