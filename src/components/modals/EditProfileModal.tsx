import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../core/Button';
import {
  validateUsername,
  checkUsernameAvailability,
  normalizeHandle,
} from '../../api/authService';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const EditProfileForm: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [fullName, setFullName] = useState(user.fullName || '');
  const [handle, setHandle] = useState(user.handle || '');
  const [academicTitle, setAcademicTitle] = useState(user.academicTitle || '');
  const [institution, setInstitution] = useState(user.institution || '');
  const [bio, setBio] = useState(user.bio || '');
  const [country, setCountry] = useState(user.country || '');
  const [location, setLocation] = useState(user.location || '');
  const [researchInterestsInput, setResearchInterestsInput] = useState(
    (user.researchInterests || []).join(', ')
  );
  const [orcidId, setOrcidId] = useState(user.orcidId || '');
  const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const isCurrentHandle = cleanHandle === normalizeHandle(user.handle);
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

  // Debounced async check for valid new handles
  useEffect(() => {
    if (!cleanHandle || isCurrentHandle || (valResult && !valResult.isValid)) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(cleanHandle, user.id);
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
  }, [cleanHandle, isCurrentHandle, valResult?.isValid, user.id]);

  const handleSave = async () => {
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!valResult?.isValid) {
      setErrorMessage(valResult?.error || 'Please enter a valid handle.');
      return;
    }

    if (handleStatus.checking) {
      setErrorMessage('Checking handle availability...');
      return;
    }

    if (handleStatus.available === false) {
      setErrorMessage(handleStatus.message || 'This handle is not available.');
      return;
    }

    setIsSaving(true);

    const parsedInterests = researchInterestsInput
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const updates = {
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
      setErrorMessage(res.error || 'Failed to update profile. Please try again.');
      return;
    }

    onClose();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={colors.accentRed} style={{ marginRight: 6 }} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. Dr. Jane Doe"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Researcher Handle *</Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.prefixText}>@</Text>
              <TextInput
                style={[styles.input, styles.inputClean]}
                value={handle}
                onChangeText={(text) => {
                  setHandle(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="username"
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Academic Title / Role</Text>
            <TextInput
              style={styles.input}
              value={academicTitle}
              onChangeText={setAcademicTitle}
              placeholder="e.g. Neuroscience Student / Postdoc"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institution / Affiliation</Text>
            <TextInput
              style={styles.input}
              value={institution}
              onChangeText={setInstitution}
              placeholder="e.g. MIT / Stanford / Independent"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholder="Tell other researchers about your work..."
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={country}
                onChangeText={setCountry}
                placeholder="e.g. India"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Location / City</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. New Delhi"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Research Interests (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={researchInterestsInput}
              onChangeText={setResearchInterestsInput}
              placeholder="e.g. Neuroscience, AI in Science"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ORCID iD (Verified Researcher)</Text>
            <TextInput
              style={styles.input}
              value={orcidId}
              onChangeText={setOrcidId}
              placeholder="0000-0002-1825-0097"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Personal Website / Lab Page</Text>
            <TextInput
              style={styles.input}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://yourwebsite.edu"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Button
            title={isSaving ? 'Saving Profile...' : 'Save Profile'}
            variant="primary"
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
  );
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {visible && <EditProfileForm onClose={onClose} />}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  formContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  errorBannerText: {
    ...typography.captionBold,
    color: colors.accentRed,
    flex: 1,
    fontSize: 13,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
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
  prefixText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginRight: 2,
  },
  inputClean: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 0,
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
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
