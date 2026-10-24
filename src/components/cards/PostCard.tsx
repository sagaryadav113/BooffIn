import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import {
  Repeat2,
  MoreHorizontal,
  Check,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  UserPlus,
  PenLine,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Post } from '../../types';
import { colors, radii, spacing, typography, layout, useTheme } from '../../theme';
import { Avatar } from '../core/Avatar';
import { ReshareButton } from '../core/ReshareButton';
import { DiscussionButton } from '../core/DiscussionButton';
import { ShareToChatButton } from '../core/ShareToChatButton';
import { LikeButton } from '../core/LikeButton';
import { SaveButton } from '../core/SaveButton';
import { PaperCard } from './PaperCard';
import { PostImageCluster } from './PostImageCluster';
import { PostOptionsModal } from '../modals/PostOptionsModal';
import { EditPostModal } from '../modals/EditPostModal';
import { SharePostModal } from '../modals/SharePostModal';
import { SharePostToWorkspaceModal } from '../modals/SharePostToWorkspaceModal';
import { LikesListModal } from '../modals/LikesListModal';
import { QuotePostModal } from '../modals/QuotePostModal';
import { Popover, PopoverItem, PopoverDivider } from '../core/Popover';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';

interface PostCardProps {
  post: Post;
  style?: ViewStyle;
  onDeleted?: () => void;
  onUpdated?: (updated: Post) => void;
  isDetailView?: boolean;
}

export const PostCard: React.FC<PostCardProps> = React.memo(({
  post,
  style,
  onDeleted,
  onUpdated,
  isDetailView = false,
}) => {
  const { colors, isDark } = useTheme();
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isShareToWorkspaceOpen, setIsShareToWorkspaceOpen] = useState(false);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
  const [isRepostMenuOpen, setIsRepostMenuOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const reshareBtnRef = useRef<View>(null);
  const moreBtnRef = useRef<View>(null);

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

  const isAiCurator = Boolean(post.author?.handle?.toLowerCase().startsWith('booffin_'));

  const showFollowButton =
    !isSelf && !isAiCurator && Boolean(post.author?.id) && (!isFollowing || hasToggledInSession);

  const pathname = usePathname();
  const isCurrentlyOnThisPost = Boolean(
    isDetailView || (post.id && (pathname === `/post/${post.id}` || pathname.endsWith(`/post/${post.id}`)))
  );
  const isNavigatingRef = useRef(false);

  const handlePostPress = () => {
    if (isCurrentlyOnThisPost) return;
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 800);

    router.push({
      pathname: '/post/[id]',
      params: { id: post.id },
    });
  };

  const handleProfilePress = (e: any) => {
    e.stopPropagation();
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 800);

    router.push({
      pathname: '/profile/[id]',
      params: { id: post.author.id },
    });
  };

  // Render text with clickable @mentions, #hashtags, and interactive web URLs
  const renderFormattedContent = (content: string) => {
    const tokenRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|@[a-zA-Z0-9_]{2,30}|#[a-zA-Z0-9_\u00c0-\u024f]{2,50})/gi;
    const parts = content.split(tokenRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('#')) {
        const rawTag = part.replace(/^#/, '');
        return (
          <Text
            key={index}
            style={styles.hashtagText}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/hashtag/[tag]' as any,
                params: { tag: rawTag },
              });
            }}
          >
            {part}
          </Text>
        );
      }

      if (part.startsWith('@')) {
        const handle = part.replace('@', '');
        return (
          <Text
            key={index}
            style={styles.mentionText}
            onPress={(e) => {
              e.stopPropagation();
              if (isNavigatingRef.current) return;
              isNavigatingRef.current = true;
              setTimeout(() => {
                isNavigatingRef.current = false;
              }, 800);
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

      if (/^(https?:\/\/|www\.)/i.test(part)) {
        const trailingMatch = part.match(/[.,;:!?)]+$/);
        const trailingPunctuation = trailingMatch ? trailingMatch[0] : '';
        const cleanUrl = trailingPunctuation ? part.slice(0, -trailingPunctuation.length) : part;
        const targetUrl = cleanUrl.toLowerCase().startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;

        return (
          <React.Fragment key={index}>
            <Text
              style={styles.linkText}
              onPress={(e) => {
                e.stopPropagation();
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                Linking.openURL(targetUrl).catch((err) => {
                  console.warn('Failed to open URL:', targetUrl, err);
                });
              }}
            >
              {cleanUrl}
            </Text>
            {trailingPunctuation ? <Text>{trailingPunctuation}</Text> : null}
          </React.Fragment>
        );
      }

      return <Text key={index}>{part}</Text>;
    });
  };

  const handleLike = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleLike(post.id, currentUser?.id);
  };

  const handleRepostButtonClick = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (reshareBtnRef.current && (reshareBtnRef.current as any).measureInWindow) {
      (reshareBtnRef.current as any).measureInWindow((x: number, y: number, width: number) => {
        const windowWidth = Dimensions.get('window').width;
        const menuWidth = 205;
        const left = Math.max(12, Math.min(x - menuWidth / 2 + (width || 20) / 2, windowWidth - menuWidth - 12));
        const top = Math.max(10, y - 94);
        setMenuCoords({ top, left });
        setIsRepostMenuOpen(true);
      });
    } else {
      setIsRepostMenuOpen(true);
    }
  };

  const handleDirectRepost = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setIsRepostMenuOpen(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    toggleRepost(post.id, currentUser?.id);
  };

  const handleOpenQuoteModal = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setIsRepostMenuOpen(false);
    setIsQuoteModalOpen(true);
  };

  const handleSave = (e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSave(post.id, currentUser?.id);
  };

  const authorRole = (
    isAiCurator
      ? [post.author.institution || 'BooffIn Research Intelligence']
      : [
          post.author.academicTitle === 'Official BooffIn Curator' ? '' : post.author.academicTitle,
          post.author.institution,
        ]
  )
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={isCurrentlyOnThisPost ? 1 : 0.95}
      delayPressIn={50}
      onPress={isCurrentlyOnThisPost ? undefined : handlePostPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundCard,
          borderBottomColor: colors.border,
        },
        style,
      ]}
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
          <Text style={[styles.repostBannerText, { color: colors.textSecondary }]}>
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
            verified={post.author.orcidVerified || isAiCurator}
            verifiedColor={isAiCurator ? '#2563EB' : undefined}
          />
          <View style={styles.authorMeta}>
            <View style={styles.nameHandleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.authorName, { color: colors.textPrimary }]}>{post.author.fullName}</Text>
                {isAiCurator && (
                  <CheckCircle2 size={13} color="#2563EB" />
                )}
              </View>
              <Text style={[styles.handleText, { color: colors.textSecondary }]}>
                @{post.author.handle} · {post.createdAt}
              </Text>
            </View>
            {authorRole.length > 0 && (
              <Text style={[styles.affiliationText, { color: colors.textTertiary }]} numberOfLines={1}>
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
                { backgroundColor: isDark ? '#10B981' : '#064E3B' },
                isFollowing && {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#EAF3EE',
                  borderColor: isDark ? '#10B981' : '#A7F3D0',
                  borderWidth: 1,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              {isFollowLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isFollowing ? (isDark ? '#34D399' : '#064E3B') : '#FFFFFF'}
                  style={{ transform: [{ scale: 0.7 }] }}
                />
              ) : isFollowing ? (
                <View style={styles.followBtnContent}>
                  <Check size={11} color={isDark ? '#34D399' : '#064E3B'} strokeWidth={2.5} />
                  <Text style={[styles.postFollowingBtnText, { color: isDark ? '#34D399' : '#064E3B' }]}>Following</Text>
                </View>
              ) : (
                <View style={styles.followBtnContent}>
                  <UserPlus size={11} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.postFollowBtnText}>Follow</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <View ref={moreBtnRef} collapsable={false}>
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
      </View>

      {/* Research Article Preview Card */}
      {post.postType === 'article' && post.article ? (
        <TouchableOpacity
          onPress={isCurrentlyOnThisPost ? undefined : handlePostPress}
          activeOpacity={isCurrentlyOnThisPost ? 1 : 0.88}
          style={[styles.articleCardPreview, { backgroundColor: isDark ? '#111622' : '#F8FAFC', borderColor: colors.border }]}
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

          <Text style={[styles.articleCardTitle, { color: colors.textPrimary }]}>{post.article.title}</Text>

          {post.article.subheading ? (
            <Text style={[styles.articleCardSubheading, { color: colors.textSecondary }]}>{post.article.subheading}</Text>
          ) : null}

          {post.article.abstract ? (
            <View style={[styles.articleAbstractPreview, { backgroundColor: isDark ? '#161B26' : '#FFFFFF', borderLeftColor: isDark ? '#10B981' : '#0F172A' }]}>
              <Text style={[styles.articleAbstractText, { color: colors.textSecondary }]} numberOfLines={3}>
                {post.article.abstract}
              </Text>
            </View>
          ) : null}

          <View style={[styles.articleFooterRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.articleRefPill, { color: colors.textSecondary }]}>
              {post.article.references?.length || 0} References (APA)
            </Text>
            <View style={styles.readArticleLink}>
              <Text style={styles.readArticleLinkText}>Read Full Article</Text>
              <ArrowRight size={13} color={colors.accentBlue} />
            </View>
          </View>
        </TouchableOpacity>
      ) : post.content ? (
        <Text style={[styles.postBody, { color: colors.textPrimary }]}>
          {renderFormattedContent(post.content)}
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
        <View style={[styles.pollCard, { backgroundColor: isDark ? '#111622' : colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.pollQuestion, { color: colors.textPrimary }]}>{post.poll.question}</Text>
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
                    { backgroundColor: isDark ? '#161B26' : colors.white, borderColor: colors.border },
                    isSelected && {
                      borderColor: isDark ? '#10B981' : colors.textPrimary,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(17, 24, 39, 0.02)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pollProgressFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(17, 24, 39, 0.08)',
                      },
                      isSelected && {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(17, 24, 39, 0.16)',
                      },
                    ]}
                  />
                  <View style={styles.pollOptionLeft}>
                    {isSelected && (
                      <Check size={16} color={isDark ? '#34D399' : colors.textPrimary} style={styles.pollCheckIcon} />
                    )}
                    <Text
                      style={[
                        styles.pollOptionText,
                        { color: colors.textPrimary },
                        isSelected && styles.pollOptionTextSelected,
                      ]}
                    >
                      {opt.text}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.pollOptionPercent,
                      { color: colors.textSecondary },
                      isSelected && { color: colors.textPrimary, fontWeight: '700' },
                    ]}
                  >
                    {percent}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.pollFooterRow}>
            <Text style={[styles.pollVotesFooter, { color: colors.textSecondary }]}>
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

      {/* Embedded Quoted Post (Twitter-Style Quote Card) */}
      {post.quotedPost && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={(e) => {
            e.stopPropagation();
            if (post.quotedPost?.id) {
              if (pathname === `/post/${post.quotedPost.id}`) return;
              if (isNavigatingRef.current) return;
              isNavigatingRef.current = true;
              setTimeout(() => {
                isNavigatingRef.current = false;
              }, 800);
              router.push({
                pathname: '/post/[id]',
                params: { id: post.quotedPost.id },
              });
            }
          }}
          style={[styles.quotedPostCard, { backgroundColor: isDark ? '#111622' : '#F8FAFC', borderColor: colors.border }]}
        >
          <View style={styles.quotedPostHeader}>
            <Avatar
              uri={post.quotedPost.author?.avatarUrl || undefined}
              name={post.quotedPost.author?.fullName || post.quotedPost.author?.handle || 'Researcher'}
              size="xs"
            />
            <Text style={[styles.quotedAuthorName, { color: colors.textPrimary }]} numberOfLines={1}>
              {post.quotedPost.author?.fullName || 'Researcher'}
            </Text>
            {post.quotedPost.author?.handle ? (
              <Text style={[styles.quotedAuthorHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                @{post.quotedPost.author.handle}
              </Text>
            ) : null}
            {post.quotedPost.createdAt ? (
              <>
                <Text style={[styles.quotedDot, { color: colors.textTertiary }]}>·</Text>
                <Text style={[styles.quotedTime, { color: colors.textTertiary }]}>{post.quotedPost.createdAt}</Text>
              </>
            ) : null}
          </View>

          {post.quotedPost.content ? (
            <Text style={[styles.quotedContentText, { color: colors.textPrimary }]} numberOfLines={3}>
              {renderFormattedContent(post.quotedPost.content)}
            </Text>
          ) : null}

          {post.quotedPost.paper && (
            <View style={[styles.quotedPaperPill, { backgroundColor: isDark ? '#161B26' : '#FFFFFF', borderColor: colors.border }]}>
              <Text style={styles.quotedPaperIcon}>🔬</Text>
              <Text style={[styles.quotedPaperTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {post.quotedPost.paper.title}
              </Text>
            </View>
          )}

          {post.quotedPost.images && post.quotedPost.images.length > 0 && (
            <View style={styles.quotedImageWrap}>
              <Image
                source={{ uri: post.quotedPost.images[0] }}
                style={styles.quotedImage}
                contentFit="cover"
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Topic Chips */}
      {Array.isArray(post.topics) && post.topics.filter((t) => typeof t === 'string' && t.trim().length > 0).length > 0 ? (
        <View style={styles.topicChipsRow}>
          {post.topics
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => (
              <View key={t} style={[styles.topicChip, { backgroundColor: isDark ? '#161B26' : colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.topicChipText, { color: colors.textSecondary }]}>#{t.trim()}</Text>
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

        {/* In-App Direct Share to Chat / Workspace (DM, Community, Inner Circle) */}
        <ShareToChatButton
          onPress={() => setIsShareToWorkspaceOpen(true)}
          size={19}
          style={styles.actionItem}
        />

        {/* Re-share (Animated Paper Plane & Orbit) with Popover */}
        <View ref={reshareBtnRef} collapsable={false}>
          <ReshareButton
            isReposted={Boolean(post.isReposted)}
            repostsCount={post.repostsCount}
            onPress={handleRepostButtonClick}
            size={19}
            style={styles.actionItem}
          />
        </View>

        {/* Bookmark / Save (Animated Dual Papercraft & Ribbon Stamp) */}
        <SaveButton
          isSaved={Boolean(post.isSaved)}
          onPress={handleSave}
          size={19}
          style={styles.actionItemRight}
        />
      </View>

      {/* Repost Hovering Popover Menu (Twitter-style: Repost vs Repost with thoughts) */}
      <Popover
        visible={isRepostMenuOpen}
        onClose={() => setIsRepostMenuOpen(false)}
        anchorRef={reshareBtnRef}
        anchorCoords={menuCoords}
        position="top"
        align="center"
        estimatedWidth={210}
        estimatedHeight={95}
      >
        <PopoverItem
          icon={<Repeat2 size={16} color={post.isReposted ? '#10B981' : '#334155'} />}
          label={post.isReposted ? 'Undo Repost' : 'Repost'}
          active={Boolean(post.isReposted)}
          activeColor="#10B981"
          onPress={handleDirectRepost}
        />
        <PopoverDivider />
        <PopoverItem
          icon={<PenLine size={16} color="#334155" />}
          label="Repost with thoughts"
          onPress={handleOpenQuoteModal}
        />
      </Popover>

      {/* Quote Post Modal (Twitter-style "Repost with thoughts" composer) */}
      {isQuoteModalOpen && (
        <QuotePostModal
          visible={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          post={post}
        />
      )}

      {/* Post Options Menu Popover */}
      {isOptionsOpen && (
        <PostOptionsModal
          visible={isOptionsOpen}
          onClose={() => setIsOptionsOpen(false)}
          post={post}
          anchorRef={moreBtnRef}
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

      {/* Share Post Modal (External / System share sheet) */}
      {isShareOpen && (
        <SharePostModal
          visible={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          post={post}
        />
      )}

      {/* Share to Workspace Modal (In-app DM, Community, Inner Circle) */}
      {isShareToWorkspaceOpen && (
        <SharePostToWorkspaceModal
          visible={isShareToWorkspaceOpen}
          onClose={() => setIsShareToWorkspaceOpen(false)}
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
  hashtagText: {
    color: '#0D9488',
    fontWeight: '700',
  },
  linkText: {
    color: colors.accentBlue,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
  quotedPostCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  quotedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quotedAuthorName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 150,
  },
  quotedAuthorHandle: {
    fontSize: 12.5,
    color: '#64748B',
    maxWidth: 120,
  },
  quotedDot: {
    fontSize: 12,
    color: '#94A3B8',
  },
  quotedTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  quotedContentText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 4,
  },
  quotedPaperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 4,
  },
  quotedPaperIcon: {
    fontSize: 13,
  },
  quotedPaperTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  quotedImageWrap: {
    marginTop: 6,
    borderRadius: 8,
    overflow: 'hidden',
    height: 120,
    backgroundColor: '#E2E8F0',
  },
  quotedImage: {
    width: '100%',
    height: '100%',
  },
  repostModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  repostHoverMenu: {
    position: 'absolute',
    width: 205,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
  },
  repostHoverMenuFallback: {
    bottom: 80,
    alignSelf: 'center',
  },
  repostMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  repostMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  repostMenuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
});
