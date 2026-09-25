import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle, Heart, FileText, ArrowRight } from 'lucide-react-native';
import { Post } from '../../types';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Avatar } from '../core/Avatar';
import { Badge } from '../core/Badge';

export interface TrendingDiscussionCardProps {
  post: Post;
  style?: ViewStyle;
}

export const TrendingDiscussionCard: React.FC<TrendingDiscussionCardProps> = ({
  post,
  style,
}) => {
  const handlePress = () => {
    router.push({
      pathname: '/post/[id]',
      params: { id: post.id },
    });
  };

  const authorRole = [post.author.academicTitle, post.author.institution]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[styles.container, style]}
    >
      {/* Header with Researcher Info */}
      <View style={styles.header}>
        <Avatar
          url={post.author.avatarUrl}
          name={post.author.fullName}
          size="sm"
          verified={post.author.orcidVerified}
        />
        <View style={styles.authorMeta}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>{post.author.fullName}</Text>
            <Text style={styles.handleText}>@{post.author.handle}</Text>
          </View>
          {authorRole.length > 0 && (
            <Text style={styles.roleText} numberOfLines={1}>
              {authorRole}
            </Text>
          )}
        </View>
        <Text style={styles.timeText}>{post.createdAt}</Text>
      </View>

      {/* Discussion Content / Question */}
      <Text style={styles.content} numberOfLines={3}>
        {post.content}
      </Text>

      {/* Paper Context Pill if linked */}
      {post.paper && (
        <View style={styles.paperContextBox}>
          <FileText size={14} color={colors.textSecondary} />
          <Text style={styles.paperContextTitle} numberOfLines={1}>
            {post.paper.title}
          </Text>
          <Badge label={post.paper.journal} variant="generic" />
        </View>
      )}

      {/* Footer Metrics */}
      <View style={styles.footer}>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <MessageCircle size={15} color={colors.textSecondary} />
            <Text style={styles.metricText}>{post.commentsCount} replies</Text>
          </View>
          <View style={styles.metricItem}>
            <Heart size={15} color={colors.textSecondary} />
            <Text style={styles.metricText}>{post.likesCount}</Text>
          </View>
          {post.topics[0] && (
            <Text style={styles.topicTag}>#{post.topics[0]}</Text>
          )}
        </View>

        <View style={styles.joinAction}>
          <Text style={styles.joinText}>Join discussion</Text>
          <ArrowRight size={13} color={colors.textPrimary} />
        </View>
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
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  authorMeta: {
    marginLeft: spacing.sm + 2,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  authorName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14.5,
  },
  handleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  roleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12.5,
    marginTop: 1,
  },
  timeText: {
    ...typography.metadata,
    color: colors.textMuted,
    fontSize: 12,
  },
  content: {
    ...typography.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  paperContextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.sm,
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  paperContextTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '500',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    minHeight: layout.touchTargetMin - 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    ...typography.metadata,
    color: colors.textSecondary,
    fontSize: 13,
  },
  topicTag: {
    ...typography.captionMedium,
    color: colors.accentBlue,
    fontWeight: '600',
    fontSize: 12.5,
  },
  joinAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinText: {
    ...typography.captionBold,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 13,
  },
});
