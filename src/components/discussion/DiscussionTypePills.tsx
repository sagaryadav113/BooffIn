import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { HelpCircle, Lightbulb, FlaskConical, Layers } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionType } from '../../types';
import { DiscussionIcon } from '../core/DiscussionIcon';

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

export const DiscussionTypePills: React.FC<DiscussionTypePillsProps> = () => {
  return null;
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
