import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  AlignLeft,
  BarChart2,
  Image as ImageIcon,
  ArrowRight,
  X,
  Lightbulb,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import {
  UserPaperRating,
  PaperMetrics,
  getUserPaperRating,
  submitPaperRating,
} from '../../api/hypeScoreService';
import { useAuthStore } from '../../store/useAuthStore';
import { useDiscussionStore } from '../../store/useDiscussionStore';

export interface FloatingRatingDockProps {
  paperId: string;
  paperTitle: string;
  onRatingUpdated?: (newMetrics: PaperMetrics, userRating: UserPaperRating) => void;
  onOpenDiscussion?: () => void;
}

type RatingType = 'clarity' | 'impact' | 'visuals';

export const FloatingRatingDock: React.FC<FloatingRatingDockProps> = ({
  paperId,
  paperTitle,
  onRatingUpdated,
  onOpenDiscussion,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const addDiscussion = useDiscussionStore((s) => s.addDiscussion);

  const [userRating, setUserRating] = useState<UserPaperRating | null>(null);
  const [activePopover, setActivePopover] = useState<RatingType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Propose Modal Sheet state
  const [proposeModalVisible, setProposeModalVisible] = useState(false);
  const [proposeCategory, setProposeCategory] = useState<'replication' | 'hypothesis' | 'inquiry' | 'method'>('hypothesis');
  const [proposeTitle, setProposeTitle] = useState('');
  const [proposeContent, setProposeContent] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState(false);

  // Load existing user rating for this paper
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!paperId) return;
      const existing = await getUserPaperRating(paperId, currentUser?.id);
      if (isMounted && existing) {
        setUserRating(existing);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [paperId, currentUser?.id]);

  // Handle setting a rating 1-5
  const handleSelectScore = async (type: RatingType, score: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const payload: { [key in RatingType]?: number } = { [type]: score };
    setIsSubmitting(true);

    try {
      const res = await submitPaperRating({
        paperId,
        userId: currentUser?.id,
        ...payload,
      });

      setUserRating(res.userRating);
      if (onRatingUpdated) {
        onRatingUpdated(res.metrics, res.userRating);
      }
    } catch (err) {
      console.warn('Failed to submit rating:', err);
    } finally {
      setIsSubmitting(false);
      // Keep popover open briefly for visual confirmation, then close
      setTimeout(() => {
        setActivePopover(null);
      }, 350);
    }
  };

  // Toggle popover for given metric
  const handleTogglePopover = (type: RatingType) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActivePopover((prev) => (prev === type ? null : type));
  };

  // Submit Propose Sheet
  const handleSubmitProposal = async () => {
    if (!proposeTitle.trim() || !proposeContent.trim()) return;
    setIsSubmittingProposal(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const fullContent = `[${proposeCategory.toUpperCase()} PROPOSAL]\n**${proposeTitle.trim()}**\n\n${proposeContent.trim()}`;

    try {
      if (addDiscussion) {
        addDiscussion({
          paperId,
          content: fullContent,
          type: 'proposal',
          userId: currentUser?.id || 'researcher',
          authorName: currentUser?.fullName || 'Researcher',
          authorAvatar: currentUser?.avatarUrl,
        } as any);
      }

      setProposeSuccess(true);
      setTimeout(() => {
        setProposeSuccess(false);
        setProposeModalVisible(false);
        setProposeTitle('');
        setProposeContent('');
        if (onOpenDiscussion) onOpenDiscussion();
      }, 1200);
    } catch (err) {
      console.warn('Error submitting proposal:', err);
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const clarityVal = userRating?.clarity || 0;
  const impactVal = userRating?.impact || 0;
  const visualsVal = userRating?.visuals || 0;

  // Active popover current score
  const getActiveScore = (): number => {
    if (activePopover === 'clarity') return clarityVal;
    if (activePopover === 'impact') return impactVal;
    if (activePopover === 'visuals') return visualsVal;
    return 0;
  };

  return (
    <>
      {/* ── FLOATING ACTION DOCK CONTAINER ── */}
      <View style={styles.dockOuterContainer} pointerEvents="box-none">
        {/* Floating Stepper Popover (Shown above dock when active) */}
        {activePopover && (
          <View style={styles.popoverWrapper}>
            <View style={styles.popoverCard}>
              {/* Popover Header: SCORE on left, X/5 on right */}
              <View style={styles.popoverHeaderRow}>
                <Text style={styles.popoverScoreLabel}>SCORE</Text>
                <Text style={styles.popoverScoreRatio}>
                  {getActiveScore() > 0 ? `${getActiveScore()}/5` : '—/5'}
                </Text>
              </View>

              {/* Connecting Line + Stepper Nodes (1 - 2 - 3 - 4 - 5) */}
              <View style={styles.stepperContainer}>
                {/* Horizontal Guide Line */}
                <View style={styles.stepperTrackLine} />

                {/* 5 Stepper Nodes */}
                {[1, 2, 3, 4, 5].map((num) => {
                  const isActive = getActiveScore() === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.stepperNode,
                        isActive && styles.stepperNodeActive,
                      ]}
                      onPress={() => handleSelectScore(activePopover, num)}
                      activeOpacity={0.8}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    >
                      <Text
                        style={[
                          styles.stepperNodeText,
                          isActive && styles.stepperNodeTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Downward Caret Arrow pointing to the active button */}
            <View style={styles.popoverCaret} />
          </View>
        )}

        {/* The Main 4-Pill Horizontal Floating Dock */}
        <View style={styles.dockBar}>
          {/* 1. CLARITY PILL */}
          <TouchableOpacity
            style={[
              styles.metricPill,
              activePopover === 'clarity' && styles.metricPillActive,
            ]}
            onPress={() => handleTogglePopover('clarity')}
            activeOpacity={0.8}
          >
            <AlignLeft size={13} color="#4A5568" />
            <Text style={styles.metricLabel}>Clarity</Text>
            <View
              style={[
                styles.scoreBadge,
                clarityVal > 0 && styles.scoreBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.scoreBadgeText,
                  clarityVal > 0 && styles.scoreBadgeTextActive,
                ]}
              >
                {clarityVal > 0 ? clarityVal : '—'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2. IMPACT PILL */}
          <TouchableOpacity
            style={[
              styles.metricPill,
              activePopover === 'impact' && styles.metricPillActive,
            ]}
            onPress={() => handleTogglePopover('impact')}
            activeOpacity={0.8}
          >
            <BarChart2 size={13} color="#4A5568" />
            <Text style={styles.metricLabel}>Impact</Text>
            <View
              style={[
                styles.scoreBadge,
                impactVal > 0 && styles.scoreBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.scoreBadgeText,
                  impactVal > 0 && styles.scoreBadgeTextActive,
                ]}
              >
                {impactVal > 0 ? impactVal : '—'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 3. VISUALS PILL */}
          <TouchableOpacity
            style={[
              styles.metricPill,
              activePopover === 'visuals' && styles.metricPillActive,
            ]}
            onPress={() => handleTogglePopover('visuals')}
            activeOpacity={0.8}
          >
            <ImageIcon size={13} color="#4A5568" />
            <Text style={styles.metricLabel}>Visuals</Text>
            <View
              style={[
                styles.scoreBadge,
                visualsVal > 0 && styles.scoreBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.scoreBadgeText,
                  visualsVal > 0 && styles.scoreBadgeTextActive,
                ]}
              >
                {visualsVal > 0 ? visualsVal : '—'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 4. PROPOSE ACTION BUTTON */}
          <TouchableOpacity
            style={styles.proposeBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch {}
              setProposeModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.proposeBtnText}>Propose</Text>
            <ArrowRight size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── BACKDROP TO DISMISS POPOVER ON TAP OUTSIDE ── */}
      {activePopover && (
        <TouchableWithoutFeedback onPress={() => setActivePopover(null)}>
          <View style={styles.popoverBackdrop} />
        </TouchableWithoutFeedback>
      )}

      {/* ── PROPOSE SCIENTIFIC HYPOTHESIS / REPLICATION MODAL ── */}
      <Modal
        visible={proposeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProposeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropClose}
            activeOpacity={1}
            onPress={() => setProposeModalVisible(false)}
          />

          <View style={styles.proposeModalCard}>
            <View style={styles.proposeHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lightbulb size={18} color="#15803D" />
                <Text style={styles.proposeHeaderTitle}>Scientific Proposal</Text>
              </View>
              <TouchableOpacity
                onPress={() => setProposeModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.proposePaperTitle} numberOfLines={2}>
              {paperTitle}
            </Text>

            {proposeSuccess ? (
              <View style={styles.successStateWrap}>
                <CheckCircle2 size={46} color="#16A34A" />
                <Text style={styles.successStateTitle}>Proposal Submitted!</Text>
                <Text style={styles.successStateDesc}>
                  Your inquiry has been linked to this paper's live community discussion.
                </Text>
              </View>
            ) : (
              <>
                {/* Category Pills */}
                <Text style={styles.fieldSectionLabel}>PROPOSAL TYPE</Text>
                <View style={styles.categoryRow}>
                  {[
                    { key: 'hypothesis', label: '💡 New Hypothesis' },
                    { key: 'replication', label: '🔬 Replication' },
                    { key: 'inquiry', label: '❓ Inquiry' },
                    { key: 'method', label: '🛠️ Method Mod' },
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.catPill,
                        proposeCategory === cat.key && styles.catPillActive,
                      ]}
                      onPress={() => setProposeCategory(cat.key as any)}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          proposeCategory === cat.key && styles.catPillTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Proposal Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Proposal Headline *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Proposed in vivo validation in murine model"
                    placeholderTextColor={colors.textSecondary}
                    value={proposeTitle}
                    onChangeText={setProposeTitle}
                  />
                </View>

                {/* Proposal Details */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Scientific Details & Rationale *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe your proposed protocol, expected outcomes, or scientific question..."
                    placeholderTextColor={colors.textSecondary}
                    value={proposeContent}
                    onChangeText={setProposeContent}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitProposalBtn,
                    (!proposeTitle.trim() || !proposeContent.trim() || isSubmittingProposal) &&
                      styles.submitProposalBtnDisabled,
                  ]}
                  onPress={handleSubmitProposal}
                  disabled={!proposeTitle.trim() || !proposeContent.trim() || isSubmittingProposal}
                  activeOpacity={0.8}
                >
                  {isSubmittingProposal ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles size={16} color="#FFFFFF" />
                      <Text style={styles.submitProposalBtnText}>Submit to Community</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dockOuterContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    maxWidth: 520,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricPillActive: {
    borderColor: '#1B4D3E',
    backgroundColor: '#E8F5E9',
  },
  metricLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2D3748',
  },
  scoreBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgeActive: {
    backgroundColor: '#1B4D3E',
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5568',
  },
  scoreBadgeTextActive: {
    color: '#FFFFFF',
  },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#1B4D3E', // Exact deep forest green from screenshots
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  proposeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── STEPPER POPOVER STYLES (Matching Screenshot 2) ── */
  popoverWrapper: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    zIndex: 1001,
  },
  popoverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: 220,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  popoverHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  popoverScoreLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 0.6,
  },
  popoverScoreRatio: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A202C',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 32,
    paddingHorizontal: 4,
  },
  stepperTrackLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#CBD5E1',
    top: 15,
  },
  stepperNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  stepperNodeActive: {
    backgroundColor: '#1B4D3E', // Active solid green node
    shadowColor: '#1B4D3E',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stepperNodeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4A5568',
  },
  stepperNodeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  popoverCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    alignSelf: 'center',
    marginTop: -1,
  },
  popoverBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },

  /* ── PROPOSAL MODAL STYLES ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalBackdropClose: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  proposeModalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  proposeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  proposeHeaderTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  proposePaperTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  fieldSectionLabel: {
    ...typography.microBold,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  catPill: {
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  catPillActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#1B4D3E',
  },
  catPillText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  catPillTextActive: {
    color: '#1B4D3E',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: spacing.sm + 2,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    height: 85,
    paddingTop: 8,
  },
  submitProposalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B4D3E',
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  submitProposalBtnDisabled: {
    opacity: 0.5,
  },
  submitProposalBtnText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  successStateWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  successStateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  successStateDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 12.5,
  },
});
