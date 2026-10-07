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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { radii, spacing, typography } from '../../theme';

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
    } else {
      router.push('/profile/analytics');
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
          <Activity size={16} color="#FFFFFF" strokeWidth={2.4} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            RESEARCH IMPACT
          </Text>
          <View style={styles.viewsRow}>
            <Text style={styles.viewsValue} numberOfLines={1}>
              {formatStatNumber(totalViews)}
            </Text>
            <Text
              style={styles.viewsLabel}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Impressions (28d)
            </Text>
          </View>
        </View>
      </View>

      {/* Right: View Analytics Action Pill */}
      <View style={styles.actionPill}>
        <Text style={styles.actionText} numberOfLines={1}>
          View Analytics
        </Text>
        <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#064E3B', // Deep Emerald Green
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: spacing.sm,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 10,
    marginRight: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 10.5,
    letterSpacing: 0.7,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
    flexShrink: 1,
    minWidth: 0,
  },
  viewsValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 0,
  },
  viewsLabel: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.82)',
    fontWeight: '500',
    flexShrink: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    flexShrink: 0,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
