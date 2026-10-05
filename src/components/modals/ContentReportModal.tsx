import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {
  X,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  UserX,
  Flag,
  Sparkles,
  Bot,
  Scale,
  Ban,
  MessageSquareWarning,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { reportContent, blockUser } from '../../api/moderationService';
import { ReportType } from '../../types/moderation';

export interface ContentReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedType: ReportType;
  reportedId: string;
  targetTitle?: string;
  targetAuthorName?: string;
  targetAuthorId?: string;
  onReportSuccess?: () => void;
}

interface ReportCategoryOption {
  id: string;
  label: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}

const REPORT_CATEGORIES: ReportCategoryOption[] = [
  {
    id: 'SCIENTIFIC_INTEGRITY',
    label: 'Scientific Misconduct & Plagiarism',
    description: 'Fabricated data, plagiarized findings, image tampering, or fake authorship',
    icon: FileText,
    iconColor: '#059669',
    iconBg: '#ECFDF5',
  },
  {
    id: 'COPYRIGHT',
    label: 'Copyright & Intellectual Property',
    description: 'Unauthorized upload of publisher papers, closed preprints, or copyright breach',
    icon: Scale,
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
  },
  {
    id: 'SPAM',
    label: 'Spam, Ads, or Bot Activity',
    description: 'Commercial promotion, link farming, crypto/phishing, or automated spam',
    icon: Ban,
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
  },
  {
    id: 'HARASSMENT',
    label: 'Harassment & Hostile Behavior',
    description: 'Targeted attacks, hate speech, bullying, or toxic unacademic comments',
    icon: MessageSquareWarning,
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
  },
  {
    id: 'MISINFORMATION',
    label: 'Medical or Harmful Misinformation',
    description: 'Dangerous scientific falsehoods, fake medical cures, or pseudo-science',
    icon: AlertTriangle,
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
  },
  {
    id: 'INAPPROPRIATE',
    label: 'Graphic, Violent, or Adult Content',
    description: 'Explicit NSFW media, gore, or non-academic vulgar materials',
    icon: Flag,
    iconColor: '#E11D48',
    iconBg: '#FFF1F2',
  },
  {
    id: 'DECEPTIVE_AI',
    label: 'Undisclosed / Deceptive AI Content',
    description: 'Synthetic text or hallucinated research presented deceptively as real work',
    icon: Bot,
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
  },
  {
    id: 'OTHER',
    label: 'Other Policy Violation',
    description: 'Violates BooffIn community standards or academic ethics guidelines',
    icon: Sparkles,
    iconColor: '#475569',
    iconBg: '#F1F5F9',
  },
];

export const ContentReportModal: React.FC<ContentReportModalProps> = ({
  visible,
  onClose,
  reportedType,
  reportedId,
  targetTitle,
  targetAuthorName,
  targetAuthorId,
  onReportSuccess,
}) => {
  const [step, setStep] = useState<'category' | 'details' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategoryOption | null>(null);
  const [detailsText, setDetailsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const handleReset = () => {
    setStep('category');
    setSelectedCategory(null);
    setDetailsText('');
    setIsSubmitting(false);
    setIsBlocking(false);
    setIsBlocked(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCategorySelect = (category: ReportCategoryOption) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedCategory(category);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsSubmitting(true);
    const res = await reportContent({
      reportedType,
      reportedId,
      reason: selectedCategory.id,
      details: detailsText.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setStep('success');
      onReportSuccess?.();
    } else {
      if (Platform.OS === 'web') {
        window.alert(res.error || 'Failed to submit report. Please try again.');
      } else {
        Alert.alert('Report Error', res.error || 'Failed to submit report. Please try again.');
      }
    }
  };

  const handleBlockAuthor = async () => {
    if (!targetAuthorId || isBlocked) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setIsBlocking(true);
    const res = await blockUser(targetAuthorId);
    setIsBlocking(false);

    if (res.success) {
      setIsBlocked(true);
    } else {
      if (Platform.OS === 'web') {
        window.alert(res.error || 'Failed to block user.');
      } else {
        Alert.alert('Block Error', res.error || 'Failed to block user.');
      }
    }
  };

  const getTargetTypeLabel = () => {
    switch (reportedType) {
      case 'post':
        return 'Post / Discussion';
      case 'comment':
        return 'Comment / Reply';
      case 'profile':
        return 'Researcher Profile';
      default:
        return 'Research Content';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.flagIconWrap}>
                <Flag size={16} color="#DC2626" />
              </View>
              <div>
                <Text style={styles.headerTitle}>Report {getTargetTypeLabel()}</Text>
                {targetAuthorName ? (
                  <Text style={styles.headerSubtitle}>Author: @{targetAuthorName}</Text>
                ) : null}
              </div>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* STEP 1: CATEGORY SELECTION */}
          {step === 'category' && (
            <View style={styles.body}>
              <Text style={styles.sectionQuestion}>
                Why are you reporting this {reportedType}?
              </Text>
              <Text style={styles.sectionHint}>
                Your report is anonymous. It helps our academic review team protect research integrity.
              </Text>

              <ScrollView
                style={styles.categoryScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
              >
                {REPORT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.categoryCard}
                      onPress={() => handleCategorySelect(cat)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.categoryIconWrap, { backgroundColor: cat.iconBg }]}>
                        <Icon size={18} color={cat.iconColor} />
                      </View>
                      <View style={styles.categoryTextWrap}>
                        <Text style={styles.categoryLabel}>{cat.label}</Text>
                        <Text style={styles.categoryDesc} numberOfLines={2}>
                          {cat.description}
                        </Text>
                      </View>
                      <ChevronRight size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* STEP 2: DETAILS & CONFIRMATION */}
          {step === 'details' && selectedCategory && (
            <View style={styles.body}>
              <TouchableOpacity
                onPress={() => setStep('category')}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.backBtnText}>← Change reason</Text>
              </TouchableOpacity>

              {/* Selected reason badge */}
              <View style={styles.selectedReasonBanner}>
                <View style={[styles.categoryIconWrapSmall, { backgroundColor: selectedCategory.iconBg }]}>
                  {React.createElement(selectedCategory.icon, { size: 14, color: selectedCategory.iconColor })}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedReasonTitle}>{selectedCategory.label}</Text>
                  <Text style={styles.selectedReasonSub}>{selectedCategory.description}</Text>
                </View>
              </View>

              {/* Optional context field */}
              <Text style={styles.inputLabel}>
                Provide details or evidence (optional)
              </Text>
              <TextInput
                style={styles.detailsInput}
                placeholder="Add context, journal link, DOI, or timestamps to help reviewers understand the issue..."
                placeholderTextColor="#94A3B8"
                value={detailsText}
                onChangeText={setDetailsText}
                multiline
                maxLength={600}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{detailsText.length}/600 characters</Text>

              {/* Policy note */}
              <View style={styles.policyNotice}>
                <ShieldCheck size={14} color="#059669" />
                <Text style={styles.policyNoticeText}>
                  Reports are reviewed by human trust & safety officers under BooffIn Community & Scientific Integrity Guidelines.
                </Text>
              </View>

              {/* Submit CTA */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'success' && (
            <View style={styles.successBody}>
              <View style={styles.successIconWrap}>
                <CheckCircle2 size={36} color="#059669" />
              </View>

              <Text style={styles.successHeading}>Report Submitted</Text>
              <Text style={styles.successDescription}>
                Thank you for helping keep BooffIn a safe, rigorous, and high-trust scientific community. Our academic moderation queue has received this case.
              </Text>

              {/* Quick follow-up action: Block User */}
              {targetAuthorId && (
                <View style={styles.followupCard}>
                  <View style={styles.followupHeader}>
                    <UserX size={16} color="#DC2626" />
                    <Text style={styles.followupTitle}>
                      Block @{targetAuthorName || 'this researcher'}?
                    </Text>
                  </View>
                  <Text style={styles.followupDesc}>
                    They will no longer be able to follow you, view your research posts, or message you.
                  </Text>
                  <TouchableOpacity
                    style={[styles.blockBtn, isBlocked && styles.blockBtnDisabled]}
                    onPress={handleBlockAuthor}
                    disabled={isBlocking || isBlocked}
                    activeOpacity={0.8}
                  >
                    {isBlocking ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Text style={[styles.blockBtnText, isBlocked && styles.blockBtnTextDisabled]}>
                        {isBlocked ? '✓ Researcher Blocked' : 'Block Researcher'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flagIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 12,
    lineHeight: 18,
  },
  categoryScroll: {
    maxHeight: 380,
  },
  categoryList: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  categoryIconWrapSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#059669',
  },
  selectedReasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  selectedReasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedReasonSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  detailsInput: {
    height: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  policyNoticeText: {
    fontSize: 11.5,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successBody: {
    padding: 24,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  successHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  successDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 340,
  },
  followupCard: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  followupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  followupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  followupDesc: {
    fontSize: 11.5,
    color: '#7F1D1D',
    lineHeight: 16,
    marginBottom: 10,
  },
  blockBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  blockBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  blockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  blockBtnTextDisabled: {
    color: '#6B7280',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
