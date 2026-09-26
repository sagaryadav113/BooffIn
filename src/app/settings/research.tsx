import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { Typography } from '../../components/core/Typography';
import { Input } from '../../components/core/Input';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { SelectModal } from '../../components/settings/SelectModal';
import { useAuthStore } from '../../store/useAuthStore';
import { persistUserProfile } from '../../api/authService';

const ACADEMIC_ROLE_OPTIONS = [
  { label: 'PhD Scholar / Candidate', value: 'PhD Scholar' },
  { label: 'Postdoctoral Researcher', value: 'Postdoctoral Researcher' },
  { label: 'Professor / Faculty', value: 'Professor' },
  { label: 'Research Scientist', value: 'Research Scientist' },
  { label: 'Research Assistant', value: 'Research Assistant' },
  { label: 'Master\'s Student', value: 'Master\'s Student' },
  { label: 'Undergraduate Researcher', value: 'Undergraduate Researcher' },
  { label: 'Industry Researcher / R&D', value: 'Industry Researcher' },
  { label: 'Independent Researcher', value: 'Independent Researcher' },
];

export default function ResearchProfileScreen() {
  const { user, updateProfile } = useAuthStore();

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [academicRole, setAcademicRole] = useState(user?.academicTitle || 'PhD Scholar');
  const [department, setDepartment] = useState((user as any)?.department || '');
  const [labGroup, setLabGroup] = useState((user as any)?.labGroup || '');
  const [degreeProgram, setDegreeProgram] = useState((user as any)?.degreeProgram || '');
  const [graduationYear, setGraduationYear] = useState((user as any)?.graduationYear ? String((user as any).graduationYear) : '');

  const [primaryField, setPrimaryField] = useState((user as any)?.primaryField || '');
  const [secondaryFieldsInput, setSecondaryFieldsInput] = useState(
    Array.isArray((user as any)?.secondaryFields) ? (user as any).secondaryFields.join(', ') : ''
  );

  const [orcidId, setOrcidId] = useState(user?.orcidId || '');
  const [scholarUrl, setScholarUrl] = useState((user as any)?.googleScholarUrl || '');
  const [researchGateUrl, setResearchGateUrl] = useState((user as any)?.researchgateUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState((user as any)?.linkedinUrl || '');
  const [scopusId, setScopusId] = useState((user as any)?.scopusId || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const parsedSecondary = secondaryFieldsInput
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    const updates = {
      academicTitle: academicRole,
      department: department.trim(),
      labGroup: labGroup.trim(),
      degreeProgram: degreeProgram.trim(),
      graduationYear: graduationYear.trim() ? parseInt(graduationYear.trim(), 10) : undefined,
      primaryField: primaryField.trim(),
      secondaryFields: parsedSecondary,
      orcidId: orcidId.trim() || undefined,
      googleScholarUrl: scholarUrl.trim() || undefined,
      researchgateUrl: researchGateUrl.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      scopusId: scopusId.trim() || undefined,
    };

    const res = await updateProfile(updates as any);
    setIsSaving(false);

    if (res.success) {
      setSuccessMessage('Research profile updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to save research profile.');
    }
  };

  return (
    <SettingsLayout
      title="Research Profile"
      subtitle="Establish your scientific identity, academic role, laboratory, and verified author profiles."
      isSaving={isSaving}
    >
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

      {/* 1. Academic Identity */}
      <SettingsSectionHeader
        title="Academic Identity & Laboratory"
        description="Your verified role and lab affiliations in academia."
      />
      <SettingsCardGroup style={styles.cardPadding}>
        <View style={styles.inputGroup}>
          <Typography variant="captionBold" color={colors.textPrimary} style={{ marginBottom: spacing.xs }}>
            Academic Role
          </Typography>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.pickerSelector}
            onPress={() => setRoleModalOpen(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="Award" size="sm" color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
              <Typography variant="body" color={colors.textPrimary}>
                {academicRole}
              </Typography>
            </View>
            <Icon name="ArrowRight" size="xs" color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Input
          label="Department / Faculty"
          value={department}
          onChangeText={setDepartment}
          placeholder="e.g. Department of Molecular Biology"
          leftIcon="BookOpen"
        />

        <Input
          label="Lab / Research Group"
          value={labGroup}
          onChangeText={setLabGroup}
          placeholder="e.g. Thorne Synapse & Circuit Lab"
          hint="Name of your principal laboratory, research group, or center."
        />

        <View style={styles.rowInputs}>
          <View style={{ flex: 2, marginRight: spacing.sm }}>
            <Input
              label="Degree / Program"
              value={degreeProgram}
              onChangeText={setDegreeProgram}
              placeholder="e.g. PhD in Neuroscience"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Grad. Year"
              value={graduationYear}
              onChangeText={setGraduationYear}
              placeholder="2026"
              keyboardType="numeric"
            />
          </View>
        </View>
      </SettingsCardGroup>

      {/* 2. Research Disciplines */}
      <SettingsSectionHeader
        title="Disciplines & Field Specializations"
        description="Used for academic discovery, preprint recommendations, and peer matchmaking."
      />
      <SettingsCardGroup style={styles.cardPadding}>
        <Input
          label="Primary Field"
          value={primaryField}
          onChangeText={setPrimaryField}
          placeholder="e.g. Computational Neuroscience"
          leftIcon="Compass"
          hint="Your core scientific specialization or primary domain."
        />

        <Input
          label="Secondary Fields (comma-separated)"
          value={secondaryFieldsInput}
          onChangeText={setSecondaryFieldsInput}
          placeholder="e.g. Machine Learning, Synaptic Biophysics, Neural Coding"
          hint="Comma-separated secondary disciplines and methodologies."
        />
      </SettingsCardGroup>

      {/* 3. External Researcher Identifiers */}
      <SettingsSectionHeader
        title="Researcher Identifiers & Profiles"
        description="Public profiles and persistent scholarly identifiers."
      />
      <SettingsCardGroup style={styles.cardPadding}>
        <Input
          label="ORCID iD"
          value={orcidId}
          onChangeText={setOrcidId}
          placeholder="0000-0002-1825-0097"
          autoCapitalize="none"
          leftIcon="CheckCircle2"
          hint="Your 16-digit Open Researcher and Contributor ID."
        />

        <Input
          label="Google Scholar URL"
          value={scholarUrl}
          onChangeText={setScholarUrl}
          placeholder="https://scholar.google.com/citations?user=..."
          autoCapitalize="none"
          leftIcon="Globe"
        />

        <Input
          label="ResearchGate Profile URL"
          value={researchGateUrl}
          onChangeText={setResearchGateUrl}
          placeholder="https://www.researchgate.net/profile/..."
          autoCapitalize="none"
          leftIcon="Link"
        />

        <Input
          label="LinkedIn Profile URL"
          value={linkedinUrl}
          onChangeText={setLinkedinUrl}
          placeholder="https://www.linkedin.com/in/..."
          autoCapitalize="none"
          leftIcon="Link"
        />

        <Input
          label="Scopus Author ID"
          value={scopusId}
          onChangeText={setScopusId}
          placeholder="e.g. 57200000000"
          autoCapitalize="none"
        />
      </SettingsCardGroup>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          style={{ flex: 1, marginRight: spacing.md }}
        />
        <Button
          title={isSaving ? "Saving..." : "Save Research Profile"}
          variant="primary"
          onPress={handleSave}
          loading={isSaving}
          style={{ flex: 2 }}
        />
      </View>

      {/* Academic Role Selection Modal */}
      <SelectModal
        visible={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Select Academic Role"
        subtitle="Choose your current position or academic affiliation."
        options={ACADEMIC_ROLE_OPTIONS}
        selectedValue={academicRole}
        onSelect={(val) => setAcademicRole(val)}
      />
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  cardPadding: {
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  rowInputs: {
    flexDirection: 'row',
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
});
