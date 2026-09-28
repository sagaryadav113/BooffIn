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
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';

export interface ProfileAnalyticsBarProps {
  totalViews?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ProfileAnalyticsBar: React.FC<ProfileAnalyticsBarProps> = ({
  totalViews = 0,
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
      activeOpacity={0.8}
    >
      {/* Left: Icon, Title & Real Views in last 28d */}
      <View style={styles.leftContent}>
        <View style={styles.iconBadge}>
          <Activity size={14} color={colors.accentBlue} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            RESEARCH IMPACT & ANALYTICS
          </Text>
          <View style={styles.viewsRow}>
            <Text style={styles.colonText}>:</Text>
            <Text style={styles.viewsValue}>
              {formatStatNumber(totalViews)}
            </Text>
            <Text style={styles.viewsLabel}>Views (last 28d)</Text>
          </View>
        </View>
      </View>

      {/* Right: View Analytics Action Pill */}
      <View style={styles.actionPill}>
        <Text style={styles.actionText}>View Analytics</Text>
        <ChevronRight size={13} color={colors.accentBlue} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginVertical: spacing.sm,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    ...typography.captionBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  colonText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewsValue: {
    ...typography.bodyBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  viewsLabel: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.2)',
  },
  actionText: {
    ...typography.microBold,
    fontSize: 11,
    color: colors.accentBlue,
  },
});
