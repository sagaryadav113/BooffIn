import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {
  Activity,
  Eye,
  FileText,
  Share2,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionIcon } from '../core/DiscussionIcon';

export interface ProfileAnalyticsBarProps {
  totalViews?: number;
  totalPosts?: number;
  totalShares?: number;
  totalDiscussions?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ProfileAnalyticsBar: React.FC<ProfileAnalyticsBarProps> = ({
  totalViews = 0,
  totalPosts = 0,
  totalShares = 0,
  totalDiscussions = 0,
  onPress,
  style,
}) => {
  const formatStatNumber = (num: number): string => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return `${num}`;
  };

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View style={styles.iconBadge}>
            <Activity size={13} color={colors.accentBlue} />
          </View>
          <Text style={styles.headerTitle}>RESEARCH IMPACT & ANALYTICS</Text>
        </View>

        {/* View Details Action (replaces the removed Active Scholar badge) */}
        <View style={styles.viewAnalyticsBadge}>
          <Text style={styles.viewAnalyticsText}>View Analytics</Text>
          <ChevronRight size={12} color={colors.accentBlue} />
        </View>
      </View>

      {/* 4-Stat Metric Grid: Views, Posts, Shares, Discussions */}
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

        {/* 2. Posts (Authored Posts) */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FileText size={14} color="#8B5CF6" />
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <Text style={styles.statValue}>
            {formatStatNumber(totalPosts)}
          </Text>
        </View>

        {/* 3. Shares (Reposts & Shares) */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Share2 size={14} color="#EC4899" />
            <Text style={styles.statLabel}>Shares</Text>
          </View>
          <Text style={styles.statValue}>
            {formatStatNumber(totalShares)}
          </Text>
        </View>

        {/* 4. Scientific Discussions */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <DiscussionIcon size={14} color={colors.accentGreen} />
            <Text style={styles.statLabel}>Discussions</Text>
          </View>
          <Text style={styles.statValue}>
            {formatStatNumber(totalDiscussions)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
  viewAnalyticsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.2)',
  },
  viewAnalyticsText: {
    ...typography.microBold,
    fontSize: 10.5,
    color: colors.accentBlue,
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
});
