import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, TextInput, Alert, Platform } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { Divider } from '../../components/core/Divider';
import { Typography } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { reportContent } from '../../api/moderationService';
import { env } from '../../config/env';

export default function HelpSettingsScreen() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  const [activePolicyModal, setActivePolicyModal] = useState<'fair_use' | 'guidelines' | 'privacy' | 'terms' | null>(null);

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Error', 'Please describe the problem or feedback.');
      return;
    }

    setIsSubmitting(true);
    const res = await reportContent({
      reportedType: 'system_issue',
      reportedId: 'general_feedback',
      reason: reportReason.trim(),
      details: reportDetails.trim(),
    });
    setIsSubmitting(false);

    if (res.success) {
      setReportReason('');
      setReportDetails('');
      setReportModalOpen(false);
      setSubmitFeedback('Thank you. Your report has been submitted to the BooffIn team.');
      setTimeout(() => setSubmitFeedback(null), 5000);
    } else {
      Alert.alert('Error', res.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <SettingsLayout
      title="Help & About"
      subtitle="Academic policies, open access governance, terms of service, and support."
    >
      {submitFeedback ? (
        <View style={styles.feedbackBanner}>
          <Icon name="CheckCircle2" size="sm" color="#166534" />
          <Typography variant="caption" color="#166534" style={{ marginLeft: 8, flex: 1 }}>
            {submitFeedback}
          </Typography>
        </View>
      ) : null}

      {/* 1. Policies & Open Access */}
      <SettingsSectionHeader title="Policies & Scientific Standards" />
      <SettingsCardGroup>
        <SettingsRow
          icon="BookOpen"
          title="Open Access Fair Use Policy"
          subtitle="BooffIn does not host copyrighted publisher PDFs"
          onPress={() => setActivePolicyModal('fair_use')}
        />
        <Divider />
        <SettingsRow
          icon="Shield"
          title="Academic Community Guidelines"
          subtitle="Standards for scientific discourse, peer review, and ethics"
          onPress={() => setActivePolicyModal('guidelines')}
        />
        <Divider />
        <SettingsRow
          icon="FileText"
          title="Terms of Service"
          subtitle="User agreement and platform responsibilities"
          onPress={() => setActivePolicyModal('terms')}
        />
        <Divider />
        <SettingsRow
          icon="Lock"
          title="Privacy Policy"
          subtitle="How your academic data and credentials are protected"
          onPress={() => setActivePolicyModal('privacy')}
        />
      </SettingsCardGroup>

      {/* 2. Support & Feedback */}
      <SettingsSectionHeader title="Support & Feedback" />
      <SettingsCardGroup>
        <SettingsRow
          icon="AlertTriangle"
          title="Report a Problem / Submit Feedback"
          subtitle="Encounter a bug or want to suggest a research tool?"
          onPress={() => setReportModalOpen(true)}
        />
      </SettingsCardGroup>

      {/* 3. About BooffIn */}
      <SettingsSectionHeader title="About BooffIn" />
      <SettingsCardGroup style={styles.cardPadding}>
        <Typography variant="captionBold" color={colors.textPrimary}>
          BooffIn Academic Social Platform
        </Typography>
        <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 4, lineHeight: 20 }}>
          BooffIn is a dedicated social and networking layer for researchers, scientists, professors, PhD scholars, and students.
          We facilitate academic discovery, discussion around preprints and published works, peer exchange, and professional scientific identity.
        </Typography>

        <Divider style={{ marginVertical: spacing.md }} />

        <View style={styles.appInfoRow}>
          <Typography variant="micro" color={colors.textMuted}>
            App Version: 1.0.0 ({env.APP_ENV})
          </Typography>
          <Typography variant="micro" color={colors.textMuted}>
            Build: Production Ready
          </Typography>
        </View>
      </SettingsCardGroup>

      {/* Report Problem Modal */}
      <Modal
        visible={reportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setReportModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.reportModalCard}>
                <Typography variant="h3" color={colors.textPrimary}>
                  Report a Problem or Feedback
                </Typography>
                <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 4, marginBottom: spacing.md }}>
                  Help us improve BooffIn for the scientific community.
                </Typography>

                <TextInput
                  style={styles.reasonInput}
                  placeholder="Subject / Summary of issue..."
                  placeholderTextColor={colors.textMuted}
                  value={reportReason}
                  onChangeText={setReportReason}
                />

                <TextInput
                  style={styles.detailsInput}
                  placeholder="Additional details, error messages, or suggestions..."
                  placeholderTextColor={colors.textMuted}
                  value={reportDetails}
                  onChangeText={setReportDetails}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.modalBtnRow}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setReportModalOpen(false)}
                    style={{ flex: 1, marginRight: spacing.sm }}
                    disabled={isSubmitting}
                  />
                  <Button
                    title={isSubmitting ? "Submitting..." : "Submit Report"}
                    variant="primary"
                    onPress={handleSubmitReport}
                    loading={isSubmitting}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Policy Viewer Modal */}
      <Modal
        visible={Boolean(activePolicyModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePolicyModal(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActivePolicyModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.policyModalCard}>
                <Typography variant="h3" color={colors.textPrimary} style={{ marginBottom: spacing.md }}>
                  {activePolicyModal === 'fair_use' && 'Open Access Fair Use Policy'}
                  {activePolicyModal === 'guidelines' && 'Academic Community Guidelines'}
                  {activePolicyModal === 'terms' && 'Terms of Service'}
                  {activePolicyModal === 'privacy' && 'Privacy Policy'}
                </Typography>

                <Typography variant="caption" color={colors.textSecondary} style={{ lineHeight: 22 }}>
                  {activePolicyModal === 'fair_use' &&
                    'BooffIn connects researchers to published and preprint literature via persistent DOIs, arXiv identifiers, and Open Access metadata. BooffIn does not host or distribute copyrighted publisher PDF documents. All user discussions, highlights, and annotations represent original academic commentary.'}
                  {activePolicyModal === 'guidelines' &&
                    'BooffIn is dedicated to professional, respectful, and constructive scientific discourse. Harassment, academic dishonesty, plagiarism, unverified defamation, or impersonation of scholars is strictly prohibited and results in immediate account suspension.'}
                  {activePolicyModal === 'terms' &&
                    'By utilizing BooffIn, you agree to comply with all applicable research ethics standards, copyright laws, and intellectual property rights. Users retain ownership of their original research notes and commentaries.'}
                  {activePolicyModal === 'privacy' &&
                    'BooffIn protects your personal email, credentials, and settings using Supabase Row Level Security (RLS). We never sell user data, research topics, or browsing patterns to third-party advertising brokers.'}
                </Typography>

                <Button
                  title="Close"
                  variant="secondary"
                  onPress={() => setActivePolicyModal(null)}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  cardPadding: {
    padding: spacing.md,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  policyModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  reasonInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.sm,
  },
  detailsInput: {
    height: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
  },
});
