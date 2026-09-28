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
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="View Research Impact"
    >
      {/* Left: Icon, Title & Real Views in last 28d */}
      <View style={styles.leftContent}>
        <View style={styles.iconBadge}>
          <Activity size={15} color="#FFFFFF" />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            RESEARCH IMPACT
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
        <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.4} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#064E3B', // Rich dark green
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#047857',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
    marginVertical: spacing.sm,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
    letterSpacing: 0.6,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1.5,
  },
  colonText: {
    ...typography.captionBold,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  viewsValue: {
    ...typography.bodyBold,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewsLabel: {
    ...typography.caption,
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: spacing.sm + 3,
    paddingVertical: 5.5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  actionText: {
    ...typography.microBold,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

