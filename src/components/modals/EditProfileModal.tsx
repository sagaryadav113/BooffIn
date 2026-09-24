import React, { useState } from 'react';
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
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../core/Button';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [fullName, setFullName] = useState(user.fullName);
  const [academicTitle, setAcademicTitle] = useState(user.academicTitle);
  const [institution, setInstitution] = useState(user.institution);
  const [bio, setBio] = useState(user.bio);
  const [country, setCountry] = useState(user.country || '');
  const [location, setLocation] = useState(user.location || '');
  const [researchInterestsInput, setResearchInterestsInput] = useState(
    (user.researchInterests || []).join(', ')
  );
  const [orcidId, setOrcidId] = useState(user.orcidId || '');
  const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || '');

  const handleSave = () => {
    const parsedInterests = researchInterestsInput
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    updateProfile({
      fullName: fullName.trim(),
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
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Dr. Jane Doe"
            />
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
            title="Save Profile"
            variant="primary"
            onPress={handleSave}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
