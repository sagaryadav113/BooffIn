import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Repeat2,
  MoreHorizontal,
  Check,
  BookOpen,
  ArrowRight,
  UserPlus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Post } from '../../types';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Avatar } from '../core/Avatar';
import { ReshareButton } from '../core/ReshareButton';
import { DiscussionButton } from '../core/DiscussionButton';
import { LikeButton } from '../core/LikeButton';
import { SaveButton } from '../core/SaveButton';
import { PaperCard } from './PaperCard';
import { PostImageCluster } from './PostImageCluster';
import { PostOptionsModal } from '../modals/PostOptionsModal';
import { EditPostModal } from '../modals/EditPostModal';
import { SharePostModal } from '../modals/SharePostModal';
import { LikesListModal } from '../modals/LikesListModal';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';

interface PostCardProps {
  post: Post;
  style?: ViewStyle;
  onDeleted?: () => void;
  onUpdated?: (updated: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = React.memo(({
  post,
  style,
  onDeleted,
  onUpdated,
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);

  const toggleLike = usePostStore((s) => s.toggleLikePost);
  const toggleRepost = usePostStore((s) => s.toggleRepost);
  const toggleSave = usePostStore((s) => s.toggleSavePost);
  const votePoll = usePostStore((s) => s.votePoll);
  const currentUser = useAuthStore((s) => s.user);

  const isFollowing = useAuthStore(
    (s) =>
      Boolean(post.author?.id && s.followingIds.has(post.author.id)) ||
      Boolean(post.author?.isFollowing)
  );
  const isFollowLoading = useAuthStore(
    (s) => Boolean(post.author?.id && s.followLoadingIds.has(post.author.id))
  );
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);
  const isSelf = Boolean(currentUser?.id && currentUser.id === post.author?.id);
  const [hasToggledInSession, setHasToggledInSession] = useState(false);

  // Synchronize initial author isFollowing flag into global auth store
  React.useEffect(() => {
    if (post.author?.isFollowing && post.author.id) {
      useAuthStore.setState((state) => {
        if (!state.followingIds.has(post.author.id)) {
          const next = new Set(state.followingIds);
          next.add(post.author.id);
          return { followingIds: next };
        }
        return state;
      });
    }
  }, [post.author?.id, post.author?.isFollowing]);

  const handleToggleFollow = async (e: any) => {
    e.stopPropagation();
    if (!post.author?.id || isFollowLoading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setHasToggledInSession(true);
    await toggleFollowUser(post.author.id);
  };

  const showFollowButton =
    !isSelf && Boolean(post.author?.id) && (!isFollowing || hasToggledInSession);

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

  const handleLike = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
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
      delayPressIn={50}
      onPress={handlePostPress}
      style={[styles.container, style]}
    >
      {/* Repost Attribution Header */}
      {post.repostedBy && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (post.repostedBy?.id) {
              router.push({
                pathname: '/profile/[id]',
                params: { id: post.repostedBy.id },
              });
            }
          }}
          activeOpacity={0.8}
          style={styles.repostBanner}
        >
          <Repeat2 size={13} color={colors.textSecondary} />
          <Text style={styles.repostBannerText}>
            {currentUser?.id === post.repostedBy.id
              ? 'You reposted'
              : `${post.repostedBy.fullName || post.repostedBy.handle || 'Researcher'} reposted`}
          </Text>
        </TouchableOpacity>
      )}

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

        <View style={styles.headerRight}>
          {showFollowButton && (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={handleToggleFollow}
              disabled={isFollowLoading}
              style={[
                styles.postFollowBtn,
                isFollowing && styles.postFollowingBtn,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              {isFollowLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isFollowing ? '#064E3B' : '#FFFFFF'}
                  style={{ transform: [{ scale: 0.7 }] }}
                />
              ) : isFollowing ? (
                <View style={styles.followBtnContent}>
                  <Check size={11} color="#064E3B" strokeWidth={2.5} />
                  <Text style={styles.postFollowingBtnText}>Following</Text>
                </View>
              ) : (
                <View style={styles.followBtnContent}>
                  <UserPlus size={11} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.postFollowBtnText}>Follow</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.moreButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={(e) => {
              e.stopPropagation();
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsOptionsOpen(true);
            }}
          >
            <MoreHorizontal size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Research Article Preview Card */}
      {post.postType === 'article' && post.article ? (
        <TouchableOpacity
          onPress={handlePostPress}
          activeOpacity={0.88}
          style={styles.articleCardPreview}
        >
          <View style={styles.articleBadgeRow}>
            <View style={styles.articleBadge}>
              <BookOpen size={12} color={colors.accentBlue} />
              <Text style={styles.articleBadgeText}>RESEARCH ARTICLE</Text>
            </View>
            {post.article.readingTimeMinutes && (
              <Text style={styles.articleReadTime}>
                {post.article.readingTimeMinutes} min read
              </Text>
            )}
          </View>

          <Text style={styles.articleCardTitle}>{post.article.title}</Text>

          {post.article.subheading ? (
            <Text style={styles.articleCardSubheading}>{post.article.subheading}</Text>
          ) : null}

          {post.article.abstract ? (
            <View style={styles.articleAbstractPreview}>
              <Text style={styles.articleAbstractText} numberOfLines={3}>
                {post.article.abstract}
              </Text>
            </View>
          ) : null}

          <View style={styles.articleFooterRow}>
            <Text style={styles.articleRefPill}>
              {post.article.references?.length || 0} References (APA)
            </Text>
            <View style={styles.readArticleLink}>
              <Text style={styles.readArticleLinkText}>Read Full Article</Text>
              <ArrowRight size={13} color={colors.accentBlue} />
            </View>
          </View>
        </TouchableOpacity>
      ) : post.content ? (
        <Text style={styles.postBody}>
          {post.content.split(/(@[a-zA-Z0-9_]{2,30})/g).map((part, index) => {
            if (part.startsWith('@')) {
              const handle = part.replace('@', '');
              return (
                <Text
                  key={index}
                  style={styles.mentionText}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: '/profile/[id]',
                      params: { id: handle },
                    });
                  }}
                >
                  {part}
                </Text>
              );
            }
            return <Text key={index}>{part}</Text>;
          })}
        </Text>
      ) : null}

      {/* Attached Images Cluster with Full-Screen Lightbox */}
      {Array.isArray(post.images) && post.images.length > 0 ? (
        <PostImageCluster
          images={post.images}
          authorName={post.author?.fullName}
        />
      ) : null}


      {/* Attached Poll */}
      {post.poll ? (
        <View style={styles.pollCard}>
          <Text style={styles.pollQuestion}>{post.poll.question}</Text>
          <View style={styles.pollOptionsList}>
            {post.poll.options.map((opt) => {
              const total = post.poll?.totalVotes || 0;
              const percent = total > 0 ? Math.round((opt.votesCount / total) * 100) : 0;
              const isSelected = post.poll?.userVotedOptionId === opt.id;

              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {}
                    votePoll(post.id, opt.id, currentUser?.id);
                  }}
                  style={[
                    styles.pollOptionRow,
                    isSelected && styles.pollOptionRowSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.pollProgressFill,
                      { width: `${percent}%` },
                      isSelected && styles.pollProgressFillSelected,
                    ]}
                  />
                  <View style={styles.pollOptionLeft}>
                    {isSelected && (
                      <Check size={16} color={colors.textPrimary} style={styles.pollCheckIcon} />
                    )}
                    <Text
                      style={[
                        styles.pollOptionText,
                        isSelected && styles.pollOptionTextSelected,
                      ]}
                    >
                      {opt.text}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.pollOptionPercent,
                      isSelected && styles.pollOptionPercentSelected,
                    ]}
                  >
                    {percent}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.pollFooterRow}>
            <Text style={styles.pollVotesFooter}>
              {post.poll.totalVotes} {post.poll.totalVotes === 1 ? 'vote' : 'votes'}
              {post.poll.userVotedOptionId ? ' · Voted' : ''}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Attached External Paper Card Preview */}
      {post.paper && (
        <PaperCard
          paper={post.paper}
          fromPostId={post.id}
          style={styles.paperCardSpacing}
        />
      )}

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
        {/* Like (Animated Dual Papercraft Fold & Thumbs-Up Stamp) */}
        <LikeButton
          isLiked={Boolean(post.isLiked)}
          likesCount={post.likesCount}
          onPress={handleLike}
          onCountPress={() => {
            if (post.likesCount > 0) {
              setIsLikesModalOpen(true);
            }
          }}
          size={19}
          style={styles.actionItem}
        />

        {/* Discussions (Animated Dual Speech Bubble & Acoustic Waves) */}
        <DiscussionButton
          commentsCount={post.commentsCount}
          onPress={handlePostPress}
          size={19}
          style={styles.actionItem}
        />

        {/* Re-share (Animated Paper Plane & Orbit) */}
        <ReshareButton
          isReposted={Boolean(post.isReposted)}
          repostsCount={post.repostsCount}
          onPress={() => toggleRepost(post.id, currentUser?.id)}
          size={19}
          style={styles.actionItem}
        />

        {/* Bookmark / Save (Animated Dual Papercraft & Ribbon Stamp) */}
        <SaveButton
          isSaved={Boolean(post.isSaved)}
          onPress={handleSave}
          size={19}
          style={styles.actionItemRight}
        />
      </View>

      {/* Post Options Menu Modal */}
      {isOptionsOpen && (
        <PostOptionsModal
          visible={isOptionsOpen}
          onClose={() => setIsOptionsOpen(false)}
          post={post}
          onEditPress={() => setIsEditOpen(true)}
          onSharePress={() => setIsShareOpen(true)}
          onDeleteSuccess={onDeleted}
        />
      )}

      {/* Edit Post Modal */}
      {isEditOpen && (
        <EditPostModal
          visible={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          post={post}
          onSaveSuccess={() => {
            onUpdated?.(post);
          }}
        />
      )}

      {/* Share Post Modal */}
      {isShareOpen && (
        <SharePostModal
          visible={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          post={post}
        />
      )}

      {/* Liked By Modal */}
      {isLikesModalOpen && (
        <LikesListModal
          visible={isLikesModalOpen}
          postId={post.id}
          likesCount={post.likesCount}
          onClose={() => setIsLikesModalOpen(false)}
        />
      )}
    </TouchableOpacity>
  );
});


const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.borderDark,
  },
  repostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  repostBannerText: {
    ...typography.captionBold,
    fontSize: 12.5,
    color: colors.textSecondary,
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
    marginRight: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  postFollowBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 27,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 1,
  },
  postFollowingBtn: {
    backgroundColor: '#EAF3EE',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postFollowBtnText: {
    ...typography.captionBold,
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  postFollowingBtnText: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: '#064E3B',
    fontWeight: '700',
    letterSpacing: 0.1,
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
  mentionText: {
    color: colors.accentBlue,
    fontWeight: '600',
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
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: layout.touchTargetMin - 4,
  },
  pollOptionRowSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: 'rgba(17, 24, 39, 0.02)',
  },
  pollProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
  },
  pollProgressFillSelected: {
    backgroundColor: 'rgba(17, 24, 39, 0.16)',
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    zIndex: 1,
  },
  pollCheckIcon: {
    marginRight: spacing.xs,
  },
  pollOptionText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  pollOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pollOptionPercent: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 13,
    zIndex: 1,
  },
  pollOptionPercentSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pollFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  pollVotesFooter: {
    ...typography.metadata,
    color: colors.textSecondary,
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
  articleCardPreview: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  articleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  articleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  articleBadgeText: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.accentBlue,
  },
  articleReadTime: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  articleCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  articleCardSubheading: {
    ...typography.captionMedium,
    fontSize: 13,
    color: '#64748B',
    marginBottom: spacing.sm,
  },
  articleAbstractPreview: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 2.5,
    borderLeftColor: '#0F172A',
    padding: spacing.sm,
    borderRadius: radii.xs,
    marginBottom: spacing.sm,
  },
  articleAbstractText: {
    ...typography.captionMedium,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontStyle: 'italic',
  },
  articleFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  articleRefPill: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  readArticleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readArticleLinkText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.accentBlue,
  },
});
