import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Tag,
  GraduationCap,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Input } from '../../components/core/Input';
import { useAuthStore } from '../../store/useAuthStore';
import {
  validateUsername,
  checkUsernameAvailability,
  normalizeHandle,
} from '../../api/authService';

const DISCIPLINE_TOPICS = [
  'Neuroscience',
  'Genetics & Genomics',
  'AI in Science',
  'Cancer Biology',
  'Immunology',
  'Structural Biology',
  'Bioinformatics',
  'Computational Biology',
  'Biophysics',
  'Quantum Physics',
  'Microbiology',
  'Ecology & Evolution',
];

export default function OnboardingScreen() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Academic Identity State
  const initialName =
    user?.fullName && user.fullName.toLowerCase() !== 'researcher' ? user.fullName : '';
  const initialHandle = user?.handle && user.handle !== 'researcher' ? user.handle : '';

  const [fullName, setFullName] = useState(initialName);
  const [handle, setHandle] = useState(initialHandle);
  const [academicTitle, setAcademicTitle] = useState(user?.academicTitle || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [step1Error, setStep1Error] = useState<string | null>(null);

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
  const valResult = cleanHandle ? validateUsername(cleanHandle) : null;

  // Derived handle status without setState in effect
  const handleStatus = React.useMemo(() => {
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
      message: null,
      normalized: cleanHandle,
    };
  }, [cleanHandle, valResult, asyncStatus]);

  // Debounced availability check
  useEffect(() => {
    if (!cleanHandle || (valResult && !valResult.isValid)) {
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
  }, [cleanHandle, valResult?.isValid, user?.id]);

  // Step 2: Research Disciplines & ORCID State
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    user?.researchInterests && user.researchInterests.length > 0
      ? user.researchInterests
      : ['Neuroscience', 'AI in Science']
  );
  const [orcidId, setOrcidId] = useState(user?.orcidId || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const toggleTopic = (topic: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
    if (step2Error) setStep2Error(null);
  };

  const handleNextToStep2 = async () => {
    setStep1Error(null);
    const cleanName = fullName.trim();
    const cleanHandle = normalizeHandle(handle);

    if (!cleanName) {
      setStep1Error('Please provide your name.');
      return;
    }

    const val = validateUsername(cleanHandle);
    if (!val.isValid) {
      setStep1Error(val.error || 'Please enter a valid researcher handle.');
      return;
    }

    if (handleStatus.checking) {
      setStep1Error('Checking handle availability...');
      return;
    }

    if (handleStatus.available === false) {
      setStep1Error(handleStatus.message || 'This handle is not available.');
      return;
    }

    // Final authoritative preflight check
    const checkRes = await checkUsernameAvailability(cleanHandle, user?.id);
    if (!checkRes.isAvailable) {
      setStep1Error(checkRes.error || 'This handle is already taken.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setStep(2);
  };

  const handleCompleteOnboarding = async () => {
    setStep2Error(null);

    if (selectedTopics.length === 0) {
      setStep2Error('Please select at least one research discipline.');
      return;
    }

    setIsSaving(true);

    const cleanOrcid = orcidId.trim();
    const updatedData = {
      fullName: fullName.trim(),
      handle: normalizeHandle(handle),
      academicTitle: academicTitle.trim() || 'Research Enthusiast',
      institution: institution.trim() || 'Independent Researcher',
      researchInterests: selectedTopics,
      orcidId: cleanOrcid || undefined,
      orcidVerified: Boolean(cleanOrcid && cleanOrcid.length >= 16),
      bio:
        bio.trim() ||
        'Exploring scientific literature, asking questions, and discussing peer-reviewed science on BooffIn.',
    };

    const res = await updateProfile(updatedData);

    if (!res.success) {
      setIsSaving(false);
      setStep(1);
      setStep1Error(res.error || 'Failed to save profile. Please choose a different handle.');
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

  const isStep1Valid =
    Boolean(fullName.trim()) &&
    Boolean(handle.trim()) &&
    handleStatus.available !== false &&
    !handleStatus.checking;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.wrapper}>
          {/* Header Progress Indicator */}
          <View style={styles.headerRow}>
            {step === 2 && (
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.backButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <ArrowLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            )}

            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP {step} OF 2</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {step === 1 ? (
              /* ================= STEP 1: RESEARCHER IDENTITY ================= */
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Set up your researcher identity</Text>
                <Text style={styles.stepSubtitle}>
                  How should peers, co-authors, and the scientific community identify your contributions?
                </Text>

                {step1Error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{step1Error}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Input
                    label="Full Name *"
                    placeholder="e.g. Dr. Sagar Yadav or Maya Singh"
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (step1Error) setStep1Error(null);
                    }}
                    autoFocus
                    leftIcon="User"
                  />

                  <View>
                    <Input
                      label="Researcher Handle *"
                      placeholder="e.g. sagaryadav"
                      value={handle}
                      onChangeText={(text) => {
                        setHandle(text);
                        if (step1Error) setStep1Error(null);
                      }}
                      autoCapitalize="none"
                      leftIcon="Tag"
                      hint="Your unique @handle used in mentions and paper discussions"
                    />

                    {/* Real-time Availability Badge */}
                    {handle.trim().length > 0 && (
                      <View style={styles.availabilityContainer}>
                        {handleStatus.checking ? (
                          <View style={styles.availabilityRow}>
                            <ActivityIndicator size="small" color={colors.accentBlue} />
                            <Text style={styles.availabilityCheckingText}>
                              Checking @{handleStatus.normalized} availability...
                            </Text>
                          </View>
                        ) : handleStatus.available === true ? (
                          <View style={[styles.availabilityRow, styles.availabilitySuccess]}>
                            <CheckCircle2 size={15} color="#16a34a" />
                            <Text style={styles.availabilitySuccessText}>
                              ✓ @{handleStatus.normalized} is available
                            </Text>
                          </View>
                        ) : handleStatus.available === false ? (
                          <View style={[styles.availabilityRow, styles.availabilityError]}>
                            <AlertCircle size={15} color={colors.accentRed} />
                            <Text style={styles.availabilityErrorText}>
                              ✕ {handleStatus.message}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>

                  <Input
                    label="Academic Role / Status (Optional)"
                    placeholder="e.g. Postdoc, PhD Candidate, PI, Student"
                    value={academicTitle}
                    onChangeText={setAcademicTitle}
                    leftIcon="Shield"
                  />

                  <Input
                    label="Institution / University (Optional)"
                    placeholder="e.g. Stanford University, MIT, Independent"
                    value={institution}
                    onChangeText={setInstitution}
                    leftIcon="Inbox"
                  />
                </View>

                <View style={styles.buttonBottomArea}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      isStep1Valid
                        ? styles.primaryButtonActive
                        : styles.primaryButtonDisabled,
                    ]}
                    onPress={handleNextToStep2}
                    disabled={!isStep1Valid}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>Next: Research Disciplines</Text>
                    <ArrowRight size={18} color={colors.white} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ================= STEP 2: RESEARCH DISCIPLINES & TOPICS ================= */
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Select your research disciplines</Text>
                <Text style={styles.stepSubtitle}>
                  BooffIn customizes your personalized feed with relevant preprints, papers, and peer discussions.
                </Text>

                {step2Error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{step2Error}</Text>
                  </View>
                )}

                <View style={styles.topicsGrid}>
                  {DISCIPLINE_TOPICS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <TouchableOpacity
                        key={topic}
                        activeOpacity={0.75}
                        onPress={() => toggleTopic(topic)}
                        style={[
                          styles.topicChip,
                          isSelected ? styles.topicChipActive : styles.topicChipInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.topicChipText,
                            isSelected ? styles.topicChipTextActive : styles.topicChipTextInactive,
                          ]}
                        >
                          {topic}
                        </Text>
                        {isSelected && (
                          <CheckCircle2 size={14} color={colors.white} style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Optional ORCID and Bio */}
                <View style={styles.extraSection}>
                  <Input
                    label="ORCID iD (Optional)"
                    placeholder="0000-0002-1825-0097"
                    value={orcidId}
                    onChangeText={setOrcidId}
                    leftIcon="CheckCircle2"
                    hint="Adds a verified scholar badge to your papers and comments"
                  />

                  <Input
                    label="Short Bio (Optional)"
                    placeholder="Briefly describe your current focus or interests..."
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.buttonBottomArea}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      selectedTopics.length > 0 && !isSaving
                        ? styles.primaryButtonActive
                        : styles.primaryButtonDisabled,
                    ]}
                    onPress={handleCompleteOnboarding}
                    disabled={selectedTopics.length === 0 || isSaving}
                    activeOpacity={0.85}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Sparkles size={18} color={colors.white} style={{ marginRight: 6 }} />
                        <Text style={styles.primaryButtonText}>Complete Setup & Enter BooffIn</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  stepBadge: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginLeft: 'auto',
  },
  stepBadgeText: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl * 2,
  },
  stepContainer: {
    width: '100%',
  },
  stepTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    fontSize: 13,
  },
  formGroup: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  topicChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  topicChipInactive: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  topicChipText: {
    ...typography.captionBold,
    fontSize: 13,
  },
  topicChipTextActive: {
    color: colors.white,
  },
  topicChipTextInactive: {
    color: colors.textPrimary,
  },
  extraSection: {
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  buttonBottomArea: {
    paddingTop: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    width: '100%',
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          transition: 'all 0.15s ease',
        }
      : {}),
  },
  primaryButtonActive: {
    backgroundColor: colors.black,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray100,
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any } : {}),
  },
  primaryButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  availabilityContainer: {
    marginTop: -spacing.md + 2,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  availabilityCheckingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  availabilitySuccess: {},
  availabilitySuccessText: {
    ...typography.captionBold,
    color: '#16a34a',
    fontSize: 12,
  },
  availabilityError: {},
  availabilityErrorText: {
    ...typography.captionBold,
    color: colors.accentRed,
    fontSize: 12,
  },
});
