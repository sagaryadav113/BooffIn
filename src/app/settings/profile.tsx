import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { Avatar } from '../../components/core/Avatar';
import { Icon } from '../../components/core/Icon';
import { useAuthStore } from '../../store/useAuthStore';
import {
  validateUsername,
  checkUsernameAvailability,
  normalizeHandle,
} from '../../api/authService';

export default function ProfileSettingsScreen() {
  const { user, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [handle, setHandle] = useState(user?.handle || '');
  const [academicTitle, setAcademicTitle] = useState(user?.academicTitle || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [department, setDepartment] = useState((user as any)?.department || '');
  const [location, setLocation] = useState(user?.location || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>(user?.researchInterests || []);

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (item: string) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    const cleanHandle = normalizeHandle(handle);
    const val = validateUsername(cleanHandle);
    if (!val.isValid) {
      setErrorMessage(val.error || 'Please enter a valid handle.');
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
    setErrorMessage(null);
    setSuccessMessage(null);

    const updates = {
      fullName: fullName.trim(),
      handle: cleanHandle,
      academicTitle: academicTitle.trim(),
      institution: institution.trim(),
      department: department.trim(),
      location: location.trim(),
      websiteUrl: websiteUrl.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
      researchInterests: interests,
    };

    const res = await updateProfile(updates);

    setIsSaving(false);

    if (res.success) {
      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to update profile. Please try again.');
    }
  };

  return (
    <SettingsLayout
      title="Edit Profile"
      subtitle="Manage your public academic identity and biographical information."
      isSaving={isSaving}
    >
      {/* Avatar Header */}
      <View style={styles.avatarSection}>
        <Avatar
          uri={avatarUrl || user?.avatarUrl}
          name={fullName || 'Researcher'}
          size="xl"
        />
        <View style={styles.avatarMeta}>
          <Typography variant="captionBold" color={colors.textPrimary}>
            Profile Photo
          </Typography>
          <Typography variant="micro" color={colors.textSecondary} style={{ marginTop: 2, marginBottom: 8 }}>
            Visible across posts, citations, and author lists.
          </Typography>
        </View>
      </View>

      {successMessage ? (
        <View style={styles.successBanner}>
          <Icon name="CheckCircle2" size="sm" color="#166534" />
          <Typography variant="caption" color="#166534" style={{ marginLeft: 8, flex: 1 }}>
            {successMessage}
          </Typography>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Icon name="AlertTriangle" size="sm" color={colors.error} />
          <Typography variant="caption" color={colors.error} style={{ marginLeft: 8, flex: 1 }}>
            {errorMessage}
          </Typography>
        </View>
      ) : null}

      {/* Basic Identity */}
      <SettingsSectionHeader title="Basic Identity" />
      <SettingsCardGroup style={styles.cardPadding}>
        <Input
          label="Full Name *"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="e.g. Dr. Aris Thorne"
          leftIcon="User"
        />

        <View>
          <Input
            label="Username / Handle *"
            value={handle}
            onChangeText={(text) => {
              setHandle(text);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="e.g. aris_thorne"
            autoCapitalize="none"
            hint="Your unique @handle for mentions and direct links."
          />

          {handle.trim().length > 0 && (
            <View style={styles.availabilityRow}>
              {handleStatus.checking ? (
                <>
                  <ActivityIndicator size="small" color={colors.accentBlue} />
                  <Typography variant="micro" color={colors.textSecondary}>
                    Checking @{handleStatus.normalized} availability...
                  </Typography>
                </>
              ) : handleStatus.available === true ? (
                <>
                  <Icon name="CheckCircle2" size="xs" color="#16a34a" />
                  <Typography variant="micro" color="#16a34a" style={{ fontWeight: '600' }}>
                    ✓ {handleStatus.message}
                  </Typography>
                </>
              ) : handleStatus.available === false ? (
                <>
                  <Icon name="AlertCircle" size="xs" color={colors.accentRed} />
                  <Typography variant="micro" color={colors.accentRed} style={{ fontWeight: '600' }}>
                    ✕ {handleStatus.message}
                  </Typography>
                </>
              ) : null}
            </View>
          )}
        </View>

        <Input
          label="Avatar Image URL"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://example.com/avatar.jpg"
          autoCapitalize="none"
          hint="Direct link to your academic headshot or avatar."
        />
      </SettingsCardGroup>

      {/* Academic Affiliation */}
      <SettingsSectionHeader title="Affiliation & Role" />
      <SettingsCardGroup style={styles.cardPadding}>
        <Input
          label="Academic Role / Title"
          value={academicTitle}
          onChangeText={setAcademicTitle}
          placeholder="e.g. Postdoctoral Fellow, Associate Professor"
          leftIcon="Award"
        />

        <Input
          label="Institution / University"
          value={institution}
          onChangeText={setInstitution}
          placeholder="e.g. Oxford University, Max Planck Institute"
          leftIcon="BookOpen"
        />

        <Input
          label="Department / Faculty"
          value={department}
          onChangeText={setDepartment}
          placeholder="e.g. Department of Neuroscience & Biophysics"
        />
      </SettingsCardGroup>

      {/* Location & Web */}
      <SettingsSectionHeader title="Location & Web Presence" />
      <SettingsCardGroup style={styles.cardPadding}>
        <Input
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Oxford, United Kingdom"
          leftIcon="Globe"
        />

        <Input
          label="Personal / Lab Website"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://lab.institution.edu"
          autoCapitalize="none"
          leftIcon="Link"
        />

        <Input
          label="Academic Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Describe your current research focus, methodologies, or academic background..."
          multiline
          numberOfLines={4}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
      </SettingsCardGroup>

      {/* Research Interests Tags */}
      <SettingsSectionHeader title="Research Topics & Keywords" />
      <SettingsCardGroup style={styles.cardPadding}>
        <View style={styles.tagInputRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Add Research Topic"
              value={interestInput}
              onChangeText={setInterestInput}
              placeholder="e.g. Neural Dynamics, CRISPR"
              onSubmitEditing={handleAddInterest}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.addTagBtn}
            onPress={handleAddInterest}
          >
            <Typography variant="captionBold" color={colors.white}>
              Add
            </Typography>
          </TouchableOpacity>
        </View>

        <View style={styles.tagsContainer}>
          {interests.map((interest) => (
            <View key={interest} style={styles.tagPill}>
              <Typography variant="caption" color={colors.textPrimary}>
                {interest}
              </Typography>
              <TouchableOpacity
                onPress={() => handleRemoveInterest(interest)}
                style={styles.removeTagBtn}
              >
                <Icon name="X" size="xs" color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {interests.length === 0 && (
            <Typography variant="micro" color={colors.textMuted}>
              No topics added yet. Add research topics to improve recommendations.
            </Typography>
          )}
        </View>
      </SettingsCardGroup>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          style={{ flex: 1, marginRight: spacing.md }}
        />
        <Button
          title={isSaving ? "Saving..." : "Save Changes"}
          variant="primary"
          onPress={handleSave}
          loading={isSaving}
          style={{ flex: 2 }}
        />
      </View>
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  avatarMeta: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  cardPadding: {
    padding: spacing.md,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  addTagBtn: {
    backgroundColor: colors.black,
    height: 44,
    marginTop: 22,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeTagBtn: {
    marginLeft: 6,
    padding: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
