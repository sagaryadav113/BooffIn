import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MessageSquare, HelpCircle, Lightbulb, FlaskConical, Layers } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionType } from '../../types';

export interface DiscussionTypePillsProps {
  activeType: 'all' | DiscussionType;
  counts: {
    all: number;
    discussion: number;
    question: number;
    insight: number;
    methodology: number;
  };
  onSelectType: (type: 'all' | DiscussionType) => void;
}

export const DiscussionTypePills: React.FC<DiscussionTypePillsProps> = ({
  activeType,
  counts,
  onSelectType,
}) => {
  const tabs: Array<{
    type: 'all' | DiscussionType;
    label: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    count: number;
  }> = [
    { type: 'all', label: 'All', icon: Layers, count: counts.all },
    { type: 'discussion', label: 'Discussions', icon: MessageSquare, count: counts.discussion },
    { type: 'question', label: 'Questions', icon: HelpCircle, count: counts.question },
    { type: 'insight', label: 'Insights', icon: Lightbulb, count: counts.insight },
    { type: 'methodology', label: 'Methodology', icon: FlaskConical, count: counts.methodology },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {tabs.map((tab) => {
          const isActive = activeType === tab.type;
          const IconComponent = tab.icon;
          const iconColor = isActive ? colors.white : colors.textSecondary;

          return (
            <TouchableOpacity
              key={tab.type}
              onPress={() => onSelectType(tab.type)}
              activeOpacity={0.8}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <IconComponent size={14} color={iconColor} />
              <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  pillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  pillLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  pillLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundTertiary,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: colors.white,
  },
});
