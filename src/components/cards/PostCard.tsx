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
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Post } from '../../types';
import { colors, spacing, typography } from '../../theme';
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
    .join(' | ');

  return (
    <TouchableOpacity
      activeOpacity={0.94}
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
            size={42}
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Post Text Body (Optional) */}
      {post.content ? (
        <Text style={styles.postBody}>{post.content}</Text>
      ) : null}

      {/* Attached External Paper Card Preview */}
      {post.paper && <PaperCard paper={post.paper} style={styles.paperCardSpacing} />}

      {/* Interactions Row: Like, Comment, Repost, Bookmark */}
      <View style={styles.actionsRow}>
        {/* Like */}
        <TouchableOpacity
          onPress={handleLike}
          activeOpacity={0.7}
          style={styles.actionItem}
        >
          <Heart
            size={18}
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
          onPress={handlePostPress}
          activeOpacity={0.7}
          style={styles.actionItem}
        >
          <MessageCircle size={18} color={colors.textSecondary} />
          <Text style={styles.actionCount}>{post.commentsCount}</Text>
        </TouchableOpacity>

        {/* Repost */}
        <TouchableOpacity
          onPress={handleRepost}
          activeOpacity={0.7}
          style={styles.actionItem}
        >
          <Repeat2
            size={18}
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
          onPress={handleSave}
          activeOpacity={0.7}
          style={styles.actionItemRight}
        >
          <Bookmark
            size={18}
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
    gap: spacing.xs,
  },
  authorName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  handleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  affiliationText: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 1,
  },
  moreButton: {
    padding: spacing.xs,
  },
  postBody: {
    ...typography.body,
    fontSize: 14.5,
    color: colors.textPrimary,
    lineHeight: 21,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  paperCardSpacing: {
    marginTop: spacing.xs + 2,
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionItemRight: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionCount: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
});
