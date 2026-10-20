import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import {
  Brain,
  Dna,
  Activity,
  Cpu,
  Shield,
  Layers,
  Zap,
  Binary,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Topic } from '../../types';
import { colors as staticColors, radii, spacing, typography, layout, useColors, useIsDark } from '../../theme';
import { Button } from '../core/Button';
import { useTopicStore } from '../../store/useTopicStore';

interface TopicCardProps {
  topic: Topic;
  style?: ViewStyle;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, style }) => {
  const colors = useColors();
  const isDark = useIsDark();
  const toggleFollow = useTopicStore((s) => s.toggleFollowTopic);

  const getIcon = (name: string) => {
    const props = { size: 24, color: colors.textPrimary, strokeWidth: 1.85 };
    switch (name.toLowerCase()) {
      case 'brain':
        return <Brain {...props} />;
      case 'dna':
        return <Dna {...props} />;
      case 'activity':
        return <Activity {...props} />;
      case 'cpu':
        return <Cpu {...props} />;
      case 'shield':
        return <Shield {...props} />;
      case 'layers':
        return <Layers {...props} />;
      case 'zap':
        return <Zap {...props} />;
      case 'binary':
        return <Binary {...props} />;
      default:
        return <Brain {...props} />;
    }
  };

  const handleTopicPress = () => {
    router.push({
      pathname: '/topic/[slug]',
      params: { slug: topic.slug },
    });
  };

  const handleFollowToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleFollow(topic.id);
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000) {
      return `${Math.round(count / 1000)}K researchers`;
    }
    return `${count} researchers`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleTopicPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground,
          borderBottomColor: colors.borderLight,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.borderLight,
          },
        ]}
      >
        {getIcon(topic.iconName)}
      </View>

      <View style={styles.metaContainer}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{topic.name}</Text>
        <Text style={[styles.followers, { color: colors.textSecondary }]}>{formatFollowers(topic.followersCount)}</Text>
      </View>

      <Button
        title={topic.isFollowing ? 'Following' : 'Follow'}
        variant={topic.isFollowing ? 'outline' : 'primary'}
        size="sm"
        onPress={handleFollowToggle}
        style={styles.followButton}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.borderLight,
    backgroundColor: staticColors.cardBackground,
    minHeight: layout.touchTargetMin + 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: staticColors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    marginRight: spacing.md,
  },
  metaContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...typography.bodyBold,
    color: staticColors.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  followers: {
    ...typography.caption,
    color: staticColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  followButton: {
    minWidth: 94,
  },
});
