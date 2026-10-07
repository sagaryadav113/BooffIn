import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { Divider } from '../../components/core/Divider';
import { Typography } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { env } from '../../config/env';
import {
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  COMMUNITY_GUIDELINES,
  LEGAL_CONTACTS,
} from '../../constants/legalPolicies';

import { supabase } from '../../api/client';

export default function HelpSettingsScreen() {
  const router = useRouter();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  const [activePolicyModal, setActivePolicyModal] = useState<
    'fair_use' | 'guidelines' | 'privacy' | 'terms' | null
  >(null);

  const handleSubmitReport = async () => {
    setModalError(null);
    if (!reportReason.trim()) {
      setModalError('Please enter a summary or subject for your feedback.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('support_tickets').insert({
        sender_email: user?.email || 'app_user@letsbooffin.com',
        sender_name: user?.user_metadata?.full_name || user?.user_metadata?.username || 'App Researcher',
        user_id: user?.id || null,
        category: 'BUG_REPORT',
        subject: reportReason.trim(),
        message_body: reportDetails.trim() || reportReason.trim(),
        priority: 'NORMAL',
        status: 'NEW',
      });

      setIsSubmitting(false);

      if (error) {
        console.warn('support_tickets insert error:', error.message);
        setModalError(error.message || 'Failed to submit feedback. Please try again.');
      } else {
        setReportReason('');
        setReportDetails('');
        setModalError(null);
        setIsSubmittedSuccess(true);
        setTimeout(() => {
          setIsSubmittedSuccess(false);
          setReportModalOpen(false);
        }, 3500);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setModalError(err?.message || 'Failed to submit feedback. Please try again.');
    }
  };

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <SettingsLayout
      title="Help & About"
      subtitle="Academic policies, open access governance, terms of service, and official support."
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
          subtitle="User agreement and platform responsibilities (v2.0)"
          onPress={() => setActivePolicyModal('terms')}
        />
        <Divider />
        <SettingsRow
          icon="Lock"
          title="Privacy Policy"
          subtitle="How your academic data and credentials are protected (v2.0)"
          onPress={() => setActivePolicyModal('privacy')}
        />
      </SettingsCardGroup>

      {/* 2. Official Contact & Support */}
      <SettingsSectionHeader title="Official Support & Contact" />
      <SettingsCardGroup>
        <SettingsRow
          icon="Mail"
          title="General & Researcher Support"
          subtitle={LEGAL_CONTACTS.support}
          onPress={() => handleEmailPress(LEGAL_CONTACTS.support)}
        />
        <Divider />
        <SettingsRow
          icon="Shield"
          title="Privacy & Data Protection Officer"
          subtitle={LEGAL_CONTACTS.privacy}
          onPress={() => handleEmailPress(LEGAL_CONTACTS.privacy)}
        />
        <Divider />
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
            Controller: BooffIn Technologies
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
                {isSubmittedSuccess ? (
                  <View style={styles.successWrapper}>
                    <View style={styles.darkGreenTickCircle}>
                      <Icon name="Check" size="lg" color="#FFFFFF" />
                    </View>
                    <Typography variant="h3" color="#064E3B" style={styles.successHeadline}>
                      your feedback has been recorded
                    </Typography>
                    <Typography variant="body" color="#065F46" style={styles.successSubline}>
                      thank you for trusting BooffIn support
                    </Typography>
                    <Button
                      title="Done"
                      variant="primary"
                      onPress={() => {
                        setIsSubmittedSuccess(false);
                        setReportModalOpen(false);
                      }}
                      style={{ marginTop: spacing.md, minWidth: 120, backgroundColor: '#064E3B' }}
                    />
                  </View>
                ) : (
                  <>
                    <Typography variant="h3" color={colors.textPrimary}>
                      Report a Problem or Feedback
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 4, marginBottom: spacing.md }}>
                      Help us improve BooffIn for the scientific community.
                    </Typography>

                    {modalError && (
                      <View style={styles.modalErrorBox}>
                        <Icon name="AlertTriangle" size="sm" color="#991B1B" />
                        <Typography variant="caption" color="#991B1B" style={{ flex: 1, marginLeft: 6 }}>
                          {modalError}
                        </Typography>
                      </View>
                    )}

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
                        onPress={() => {
                          setModalError(null);
                          setReportModalOpen(false);
                        }}
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
                  </>
                )}
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
                <Typography variant="h3" color={colors.textPrimary} style={{ marginBottom: spacing.sm }}>
                  {activePolicyModal === 'fair_use' && 'Open Access Fair Use Policy'}
                  {activePolicyModal === 'guidelines' && COMMUNITY_GUIDELINES.title}
                  {activePolicyModal === 'terms' && TERMS_OF_SERVICE.title}
                  {activePolicyModal === 'privacy' && PRIVACY_POLICY.title}
                </Typography>

                <ScrollView style={{ maxHeight: 380, marginVertical: spacing.sm }} showsVerticalScrollIndicator={true}>
                  {activePolicyModal === 'fair_use' && (
                    <Typography variant="caption" color={colors.textSecondary} style={{ lineHeight: 22 }}>
                      BooffIn connects researchers to published and preprint literature via persistent DOIs, arXiv identifiers, and Open Access metadata. BooffIn does not host or distribute copyrighted publisher PDF documents. All user discussions, highlights, and annotations represent original academic commentary.
                    </Typography>
                  )}

                  {activePolicyModal === 'guidelines' && (
                    <View>
                      <Typography variant="caption" color={colors.textSecondary} style={{ lineHeight: 22, marginBottom: 8 }}>
                        {COMMUNITY_GUIDELINES.summary}
                      </Typography>
                      {COMMUNITY_GUIDELINES.sections.map((sec, idx) => (
                        <View key={idx} style={{ marginTop: 8 }}>
                          <Typography variant="captionBold" color={colors.textPrimary}>
                            {sec.title}
                          </Typography>
                          {sec.content.map((p, pIdx) => (
                            <Typography key={pIdx} variant="micro" color={colors.textSecondary} style={{ lineHeight: 18, marginTop: 2 }}>
                              • {p}
                            </Typography>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}

                  {activePolicyModal === 'terms' && (
                    <View>
                      <Typography variant="caption" color={colors.textSecondary} style={{ lineHeight: 22, marginBottom: 8 }}>
                        {TERMS_OF_SERVICE.summary}
                      </Typography>
                      {TERMS_OF_SERVICE.sections.map((sec, idx) => (
                        <View key={idx} style={{ marginTop: 8 }}>
                          <Typography variant="captionBold" color={colors.textPrimary}>
                            {sec.title}
                          </Typography>
                          {sec.content.map((p, pIdx) => (
                            <Typography key={pIdx} variant="micro" color={colors.textSecondary} style={{ lineHeight: 18, marginTop: 2 }}>
                              {p}
                            </Typography>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}

                  {activePolicyModal === 'privacy' && (
                    <View>
                      <Typography variant="caption" color={colors.textSecondary} style={{ lineHeight: 22, marginBottom: 8 }}>
                        {PRIVACY_POLICY.summary}
                      </Typography>
                      {PRIVACY_POLICY.sections.map((sec, idx) => (
                        <View key={idx} style={{ marginTop: 8 }}>
                          <Typography variant="captionBold" color={colors.textPrimary}>
                            {sec.title}
                          </Typography>
                          {sec.content.map((p, pIdx) => (
                            <Typography key={pIdx} variant="micro" color={colors.textSecondary} style={{ lineHeight: 18, marginTop: 2 }}>
                              {p}
                            </Typography>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalBtnRow}>
                  {activePolicyModal === 'privacy' && (
                    <Button
                      title="Open Web Page"
                      variant="outline"
                      onPress={() => {
                        setActivePolicyModal(null);
                        router.push('/privacy');
                      }}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                  )}
                  {activePolicyModal === 'terms' && (
                    <Button
                      title="Open Web Page"
                      variant="outline"
                      onPress={() => {
                        setActivePolicyModal(null);
                        router.push('/terms');
                      }}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                  )}
                  <Button
                    title="Close"
                    variant="secondary"
                    onPress={() => setActivePolicyModal(null)}
                    style={{ flex: 1 }}
                  />
                </View>
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
    maxWidth: 600,
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
    marginTop: spacing.md,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  darkGreenTickCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#064E3B',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  successHeadline: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  successSubline: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
