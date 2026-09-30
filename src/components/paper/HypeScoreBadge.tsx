import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Flame, Info, TrendingUp, Award, Eye, X } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { PaperMetrics } from '../../api/hypeScoreService';

export interface HypeScoreBadgeProps {
  score: number; // 0 - 100
  metrics?: PaperMetrics;
  size?: 'sm' | 'md' | 'lg';
  showDetailsOnPress?: boolean;
}

export const HypeScoreBadge: React.FC<HypeScoreBadgeProps> = ({
  score,
  metrics,
  size = 'md',
  showDetailsOnPress = true,
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);

  const getBadgeColors = (s: number) => {
    if (s >= 80) return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', flame: '#D97706' };
    if (s >= 60) return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', flame: '#16A34A' };
    return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', flame: '#64748B' };
  };

  const c = getBadgeColors(score);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.badgeBase,
          size === 'sm' && styles.badgeSm,
          size === 'lg' && styles.badgeLg,
          { backgroundColor: c.bg, borderColor: c.border },
        ]}
        onPress={() => {
          if (showDetailsOnPress) setDetailsVisible(true);
        }}
        activeOpacity={showDetailsOnPress ? 0.75 : 1}
      >
        <Flame
          size={size === 'sm' ? 11 : size === 'lg' ? 16 : 13}
          color={c.flame}
          fill={c.flame}
        />
        <Text
          style={[
            styles.badgeText,
            size === 'sm' && styles.badgeTextSm,
            size === 'lg' && styles.badgeTextLg,
            { color: c.text },
          ]}
        >
          HYPE {score}
        </Text>
      </TouchableOpacity>

      {/* Breakdown Modal */}
      {detailsVisible && (
        <Modal
          visible={detailsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setDetailsVisible(false)}
            />

            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Flame size={20} color="#D97706" fill="#D97706" />
                  <Text style={styles.modalTitle}>BOOFFIN HYPE SCORE</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.scoreHeroRow}>
                <Text style={styles.heroScoreText}>{score}</Text>
                <View>
                  <Text style={styles.heroScoreMax}>/ 100</Text>
                  <Text style={styles.heroScoreSub}>Scientific Impact Index</Text>
                </View>
              </View>

              <Text style={styles.explanationText}>
                HYPE combines peer community evaluation with real reader momentum. Large view counts are logarithmically scaled so scientific quality ratings always dominate.
              </Text>

              {/* Weight Breakdown */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Award size={15} color="#15803D" />
                    <Text style={styles.breakdownLabel}>Community Peer Rating (70%)</Text>
                  </View>
                  <Text style={styles.breakdownVal}>
                    {metrics ? `${metrics.ratingScore} pts` : '70% weight'}
                  </Text>
                </View>
                <Text style={styles.breakdownSub}>
                  Evaluated on Impact, Clarity, and Visuals (1–5) with Bayesian anti-manipulation protection.
                </Text>

                <View style={[styles.breakdownRow, { marginTop: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={15} color="#2563EB" />
                    <Text style={styles.breakdownLabel}>Field Popularity (30%)</Text>
                  </View>
                  <Text style={styles.breakdownVal}>
                    {metrics ? `${metrics.popularityScore} pts` : '30% weight'}
                  </Text>
                </View>
                <Text style={styles.breakdownSub}>
                  Logarithmic readership percentile normalized within relevant research field.
                </Text>
              </View>

              {metrics && (
                <View style={styles.statsFooter}>
                  <View style={styles.statCol}>
                    <Text style={styles.statVal}>{metrics.views.toLocaleString()}</Text>
                    <Text style={styles.statLbl}>Total Readers</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statVal}>+{metrics.viewsLast24h}</Text>
                    <Text style={styles.statLbl}>Readers Today</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statVal}>{metrics.communityRating.toFixed(1)} ★</Text>
                    <Text style={styles.statLbl}>Peer Consensus</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setDetailsVisible(false)}
              >
                <Text style={styles.closeModalBtnText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeLg: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  badgeTextSm: {
    fontSize: 10.5,
  },
  badgeTextLg: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  scoreHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: spacing.xs,
  },
  heroScoreText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#D97706',
  },
  heroScoreMax: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  heroScoreSub: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
  },
  explanationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  breakdownCard: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  breakdownLabel: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  breakdownVal: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  breakdownSub: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
  statsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  statLbl: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  closeModalBtn: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
});
