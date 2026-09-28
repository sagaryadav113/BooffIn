import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  Activity,
  Eye,
  GraduationCap,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionIcon } from '../core/DiscussionIcon';
import { LikeIcon } from '../core/LikeIcon';

export interface ProfileAnalyticsBarProps {
  totalViews?: number;
  totalLikes?: number;
  totalDiscussions?: number;
  totalPublications?: number;
  totalCitations?: number;
  isOwnProfile?: boolean;
  style?: ViewStyle;
}

export const ProfileAnalyticsBar: React.FC<ProfileAnalyticsBarProps> = ({
  totalViews = 0,
  totalLikes = 0,
  totalDiscussions = 0,
  totalPublications = 0,
  totalCitations = 0,
  isOwnProfile = false,
  style,
}) => {
  const formatStatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return `${num}`;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View style={styles.iconBadge}>
            <Activity size={13} color={colors.accentBlue} />
          </View>
          <Text style={styles.headerTitle}>RESEARCH IMPACT & ANALYTICS</Text>
        </View>

        <View style={styles.badgePill}>
          <Sparkles size={11} color={colors.accentGreen} />
          <Text style={styles.badgePillText}>
            {isOwnProfile ? 'Active Scholar' : 'Verified Impact'}
          </Text>
        </View>
      </View>

      {/* 4-Stat Metric Grid */}
      <View style={styles.grid}>
        {/* 1. Research Reach / Views */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Eye size={14} color={colors.accentBlue} />
            <Text style={styles.statLabel}>Views & Reach</Text>
          </View>
          <Text style={styles.statValue}>
            {formatStatNumber(totalViews)}
          </Text>
        </View>

        {/* 2. Peer Endorsements / Likes */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <LikeIcon size={14} isLiked={true} color={colors.textPrimary} />
            <Text style={styles.statLabel}>Peer Endorsements</Text>
          </View>
          <Text style={styles.statValue}>
            {formatStatNumber(totalLikes)}
          </Text>
        </View>

        {/* 3. Scientific Discussions */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <DiscussionIcon size={14} color={colors.accentGreen} />
            <Text style={styles.statLabel}>Discussions</Text>
          </View>
          <Text style={styles.statValue}>
            {formatStatNumber(totalDiscussions)}
          </Text>
        </View>

        {/* 4. Publications & Citations */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <GraduationCap size={14} color="#8B5CF6" />
            <Text style={styles.statLabel}>Publications</Text>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>
              {formatStatNumber(totalPublications)}
            </Text>
            {totalCitations > 0 && (
              <Text style={styles.statSubValue}>
                · {formatStatNumber(totalCitations)} cites
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md - 2,
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.captionBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgePillText: {
    ...typography.microBold,
    fontSize: 10.5,
    color: colors.accentGreen,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.white,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
    flex: 1,
  },
  statValue: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statSubValue: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
