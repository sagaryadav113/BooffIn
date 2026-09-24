import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Topic } from '../../types';
import { colors, radii, spacing, typography } from '../../theme';
import { Icon, IconName } from '../core/Icon';

export interface TopicCategoryCardProps {
  topic: Topic;
  style?: ViewStyle;
}

export const TopicCategoryCard: React.FC<TopicCategoryCardProps> = ({
  topic,
  style,
}) => {
  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    router.push({
      pathname: '/topic/[slug]',
      params: { slug: topic.slug },
    });
  };

  const getTopicIcon = (iconName: string): IconName => {
    const validIcons: IconName[] = [
      'Brain',
      'Dna',
      'Activity',
      'Cpu',
      'Shield',
      'Layers',
      'Zap',
      'Binary',
      'Atom',
      'FlaskConical',
      'Pill',
      'Microscope',
      'Terminal',
      'Leaf',
      'Sparkles',
    ];
    const match = validIcons.find(
      (i) => i.toLowerCase() === iconName.toLowerCase()
    );
    return match || 'Brain';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[styles.container, style]}
    >
      <View style={styles.iconCircle}>
        <Icon name={getTopicIcon(topic.iconName)} size={20} color={colors.textPrimary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {topic.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {topic.postsCount.toLocaleString()} papers · {topic.category}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.sm + 2,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
  },
});
