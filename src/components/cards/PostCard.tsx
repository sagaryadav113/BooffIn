import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Post } from '../../types';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Avatar } from '../core/Avatar';
import { PaperCard } from './PaperCard';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';

interface PostCardProps {
  post: Post;
  style?: ViewStyle;
}

export const PostCard: React.FC<PostCardProps> = ({ post, style }) => {
  const toggleLike = usePostStore((s) => s.toggleLikePost);
  const toggleRepost = usePostStore((s) => s.toggleRepost);
  const toggleSave = usePostStore((s) => s.toggleSavePost);
  const currentUser = useAuthStore((s) => s.user);

  const handlePostPress = () => {
    router.push({
      pathname: '/post/[id]',
      params: { id: post.id },
    });
  };

  const handleProfilePress = (e: any) => {
    e.stopPropagation();
    router.push({
      pathname: '/profile/[id]',
      params: { id: post.author.id },
    });
  };

  const handleLike = (e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleLike(post.id, currentUser?.id);
  };

  const handleRepost = (e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleRepost(post.id, currentUser?.id);
  };

  const handleSave = (e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSave(post.id, currentUser?.id);
  };

  const authorRole = [post.author.academicTitle, post.author.institution]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handlePostPress}
      style={[styles.container, style]}
    >
      {/* Header: Avatar, Name, Handle, Timestamp, Field */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleProfilePress}
          activeOpacity={0.8}
          style={styles.authorRow}
        >
          <Avatar
            url={post.author.avatarUrl}
            name={post.author.fullName}
            size="md"
            verified={post.author.orcidVerified}
          />
          <View style={styles.authorMeta}>
            <View style={styles.nameHandleRow}>
              <Text style={styles.authorName}>{post.author.fullName}</Text>
              <Text style={styles.handleText}>
                @{post.author.handle} · {post.createdAt}
              </Text>
            </View>
            {authorRole.length > 0 && (
              <Text style={styles.affiliationText} numberOfLines={1}>
                {authorRole}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moreButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Post Text Body */}
      {post.content ? (
        <Text style={styles.postBody}>{post.content}</Text>
      ) : null}

      {/* Attached Images */}
      {Array.isArray(post.images) && post.images.length > 0 ? (
        <View style={styles.imageGrid}>
          {post.images.map((imgUrl, idx) => (
            <Image
              key={idx}
              source={{ uri: imgUrl }}
              style={styles.postImage}
              contentFit="cover"
              transition={200}
            />
          ))}
        </View>
      ) : null}

      {/* Attached Poll */}
      {post.poll ? (
        <View style={styles.pollCard}>
          <Text style={styles.pollQuestion}>{post.poll.question}</Text>
          <View style={styles.pollOptionsList}>
            {post.poll.options.map((opt) => {
              const total = post.poll?.totalVotes || 0;
              const percent = total > 0 ? Math.round((opt.votesCount / total) * 100) : 0;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.7}
                  onPress={(e) => e.stopPropagation()}
                  style={styles.pollOptionRow}
                >
                  <View style={[styles.pollProgressFill, { width: `${percent}%` }]} />
                  <Text style={styles.pollOptionText}>{opt.text}</Text>
                  <Text style={styles.pollOptionPercent}>{percent}%</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.pollVotesFooter}>
            {post.poll.totalVotes} {post.poll.totalVotes === 1 ? 'vote' : 'votes'}
          </Text>
        </View>
      ) : null}

      {/* Attached External Paper Card Preview */}
      {post.paper && <PaperCard paper={post.paper} style={styles.paperCardSpacing} />}

      {/* Topic Chips */}
      {Array.isArray(post.topics) && post.topics.filter((t) => typeof t === 'string' && t.trim().length > 0).length > 0 ? (
        <View style={styles.topicChipsRow}>
          {post.topics
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => (
              <View key={t} style={styles.topicChip}>
                <Text style={styles.topicChipText}>#{t.trim()}</Text>
              </View>
            ))}
        </View>
      ) : null}

      {/* Interactions Row: Like, Comment, Repost, Bookmark */}
      <View style={styles.actionsRow}>
        {/* Like */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={post.isLiked ? 'Unlike post' : 'Like post'}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          onPress={handleLike}
          activeOpacity={0.7}
          style={styles.actionItem}
        >
          <Heart
            size={20}
            color={post.isLiked ? colors.accentRed : colors.textSecondary}
            fill={post.isLiked ? colors.accentRed : 'transparent'}
          />
          <Text
            style={[
              styles.actionCount,
              post.isLiked && { color: colors.accentRed, fontWeight: '600' },
            ]}
          >
            {post.likesCount}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Comments"
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          onPress={handlePostPress}
          activeOpacity={0.7}
          style={styles.actionItem}
        >
          <MessageCircle size={20} color={colors.textSecondary} />
          <Text style={styles.actionCount}>{post.commentsCount}</Text>
        </TouchableOpacity>

        {/* Repost */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={post.isReposted ? 'Undo repost' : 'Repost'}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          onPress={handleRepost}
          activeOpacity={0.7}
          style={styles.actionItem}
        >
          <Repeat2
            size={20}
            color={post.isReposted ? colors.accentGreen : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionCount,
              post.isReposted && { color: colors.accentGreen, fontWeight: '600' },
            ]}
          >
            {post.repostsCount}
          </Text>
        </TouchableOpacity>

        {/* Bookmark / Save */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={post.isSaved ? 'Remove bookmark' : 'Bookmark post'}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          onPress={handleSave}
          activeOpacity={0.7}
          style={styles.actionItemRight}
        >
          <Bookmark
            size={20}
            color={post.isSaved ? colors.black : colors.textSecondary}
            fill={post.isSaved ? colors.black : 'transparent'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorMeta: {
    marginLeft: spacing.md,
    flex: 1,
  },
  nameHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  authorName: {
    ...typography.bodyBold,
    fontSize: 15.5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  handleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13.5,
  },
  affiliationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  moreButton: {
    padding: spacing.xs,
    minHeight: layout.touchTargetMin - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBody: {
    ...typography.body,
    fontSize: 15.5,
    color: colors.textPrimary,
    lineHeight: 23,
    marginTop: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  paperCardSpacing: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: layout.touchTargetMin - 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionItemRight: {
    minHeight: layout.touchTargetMin - 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCount: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13.5,
  },
  imageGrid: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  postImage: {
    width: '100%',
    height: 230,
    backgroundColor: colors.backgroundSecondary,
  },
  pollCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    padding: spacing.md + 2,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pollQuestion: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontSize: 15,
  },
  pollOptionsList: {
    gap: spacing.xs + 2,
  },
  pollOptionRow: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: layout.touchTargetMin - 4,
  },
  pollProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
  },
  pollOptionText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    zIndex: 1,
  },
  pollOptionPercent: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 13,
    zIndex: 1,
  },
  pollVotesFooter: {
    ...typography.metadata,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  topicChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  topicChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  topicChipText: {
    ...typography.captionMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
