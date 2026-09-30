import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  AlignLeft,
  BarChart2,
  Image as ImageIcon,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import {
  UserPaperRating,
  PaperMetrics,
  getUserPaperRating,
  submitPaperRating,
} from '../../api/hypeScoreService';
import { useAuthStore } from '../../store/useAuthStore';

export interface FloatingRatingDockProps {
  paperId: string;
  paperTitle: string;
  onRatingUpdated?: (newMetrics: PaperMetrics, userRating: UserPaperRating) => void;
  style?: StyleProp<ViewStyle>;
}

type RatingType = 'clarity' | 'impact' | 'visuals';

export const FloatingRatingDock: React.FC<FloatingRatingDockProps> = ({
  paperId,
  paperTitle,
  onRatingUpdated,
  style,
}) => {
  const currentUser = useAuthStore((s) => s.user);

  const [userRating, setUserRating] = useState<UserPaperRating | null>(null);
  const [activePopover, setActivePopover] = useState<RatingType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const clarityVal = userRating?.clarity || 0;
  const impactVal = userRating?.impact || 0;
  const visualsVal = userRating?.visuals || 0;

  const currentScoreForPopover = activePopover
    ? activePopover === 'clarity'
      ? clarityVal
      : activePopover === 'impact'
      ? impactVal
      : visualsVal
    : 0;

  return (
    <View style={[styles.dockContainer, style]}>
      {/* ── ACTIVE STEPPER POPOVER (SCORE X/5) ── */}
      {activePopover && (
        <View style={styles.popoverWrapper}>
          <View style={styles.popoverBubble}>
            <View style={styles.popoverHeaderRow}>
              <Text style={styles.popoverHeaderTitle}>
                {activePopover === 'clarity'
                  ? 'CLARITY'
                  : activePopover === 'impact'
                  ? 'IMPACT'
                  : 'VISUALS'}
              </Text>
              <Text style={styles.popoverHeaderScore}>
                {currentScoreForPopover > 0 ? `${currentScoreForPopover}/5` : 'UNRATED'}
              </Text>
            </View>

            {/* Connected Stepper Line 1 - 2 - (3) - 4 - 5 */}
            <View style={styles.stepperTrackContainer}>
              <View style={styles.stepperHorizontalLine} />

              {[1, 2, 3, 4, 5].map((score) => {
                const isSelected = currentScoreForPopover === score;
                return (
                  <TouchableOpacity
                    key={score}
                    style={[
                      styles.stepperNode,
                      isSelected && styles.stepperNodeSelected,
                    ]}
                    onPress={() => handleSelectScore(activePopover, score)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Text
                      style={[
                        styles.stepperNodeText,
                        isSelected && styles.stepperNodeTextSelected,
                      ]}
                    >
                      {score}
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

      {/* The 3-Pill Floating Dock (Clarity, Impact, Visuals) */}
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
      </View>

      {/* ── BACKDROP TO DISMISS POPOVER ON TAP OUTSIDE ── */}
      {activePopover && (
        <TouchableWithoutFeedback onPress={() => setActivePopover(null)}>
          <View style={styles.popoverBackdrop} />
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radii.full,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  metricPillActive: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  scoreBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: radii.full,
    minWidth: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  scoreBadgeActive: {
    backgroundColor: '#1B4D3E',
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  scoreBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* ── POPOVER STYLES ── */
  popoverWrapper: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    zIndex: 1001,
  },
  popoverBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popoverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  popoverHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  popoverHeaderScore: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1B4D3E',
  },
  stepperTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 32,
    paddingHorizontal: 2,
  },
  stepperHorizontalLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#E2E8F0',
    top: 15,
  },
  stepperNode: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepperNodeSelected: {
    backgroundColor: '#1B4D3E',
    borderColor: '#1B4D3E',
    transform: [{ scale: 1.15 }],
  },
  stepperNodeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  stepperNodeTextSelected: {
    color: '#FFFFFF',
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
    top: -500,
    left: -500,
    right: -500,
    bottom: -500,
    zIndex: 999,
  },
});
