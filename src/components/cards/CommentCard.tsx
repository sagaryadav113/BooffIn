import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  Platform,
  ViewStyle,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  HelpCircle,
  Lightbulb,
  FlaskConical,
  CornerDownRight,
  Send,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { colors, radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { Comment, DiscussionType, UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';
import { DiscussionIcon } from '../core/DiscussionIcon';
import { LikeIcon } from '../core/LikeIcon';

export interface CommentCardProps {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  onAddReply?: (parentId: string, content: string) => void;
  onLike?: (commentId: string) => void;
  onLikeReply?: (commentId: string, replyId: string) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string;
  currentUser?: UserProfile;
  isReply?: boolean;
  depth?: number;
  highlighted?: boolean;
  style?: ViewStyle;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onReply,
  onAddReply,
  onLike,
  onLikeReply,
  onDelete,
  currentUserId,
  currentUser,
  isReply = false,
  depth = 0,
  highlighted = false,
  style,
}) => {
  const dynamicColors = useColors();
  const isDark = useIsDark();
  const [isInlineReplying, setIsInlineReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const isOwnComment = Boolean(
    currentUserId &&
      (comment.author?.id === currentUserId ||
        (comment.author?.id === 'usr_me' && currentUserId === 'usr_me'))
  );

  const handleAuthorPress = (userId?: string) => {
    if (!userId) return;
    router.push({
      pathname: '/profile/[id]',
      params: { id: userId },
    });
  };

  const handleLike = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onLike) {
      onLike(comment.id);
    }
  };

  const handleTriggerReply = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsInlineReplying(!isInlineReplying);
    if (!isInlineReplying) {
      setReplyText(`@${comment.author?.handle || 'scholar'} `);
    }
  };

  const handleSendInlineReply = () => {
    if (!replyText.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const textToSend = replyText.trim();
    setReplyText('');
    setIsInlineReplying(false);

    if (onAddReply) {
      onAddReply(comment.id, textToSend);
    } else if (onReply) {
      onReply({ ...comment, content: textToSend });
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = comment.postId ? `https://www.letsbooffin.com/post/${comment.postId}` : 'https://www.letsbooffin.com';
      await Share.share({
        message: `Scientific discussion by ${comment.author?.fullName || 'Researcher'} on BooffIn:\n"${comment.content}"\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  // Determine or infer discussion type badge
  const getTypeBadge = () => {
    const textLower = comment.content.toLowerCase();
    if (textLower.startsWith('[question]') || textLower.includes('?')) {
      return { label: 'Question', icon: HelpCircle, color: colors.accentBlue, bg: 'rgba(2, 132, 199, 0.08)' };
    }
    if (textLower.startsWith('[insight]') || textLower.includes('hypothesis') || textLower.includes('insight')) {
      return { label: 'Insight', icon: Lightbulb, color: colors.journalScience, bg: 'rgba(217, 119, 6, 0.08)' };
    }
    if (textLower.startsWith('[methodology]') || textLower.includes('protocol') || textLower.includes('method')) {
      return { label: 'Methodology', icon: FlaskConical, color: colors.accentGreen, bg: 'rgba(16, 185, 129, 0.08)' };
    }
    return { label: 'Discussion', icon: DiscussionIcon, color: colors.textPrimary, bg: colors.backgroundSecondary };
  };

  const badgeInfo = getTypeBadge();
  const IconComp: any = badgeInfo.icon;

  // Format mentions and URLs with clickable blue text
  const renderFormattedContent = (text: string) => {
    const cleanedText = text.replace(/^\[(question|insight|methodology|discussion)\]\s*/i, '');
    const tokenRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|@[a-zA-Z0-9_]{2,30})/gi;
    const parts = cleanedText.split(tokenRegex);

    return (
      <Text style={[styles.bodyText, { color: dynamicColors.textPrimary }]}>
        {parts.map((part, index) => {
          if (!part) return null;
          if (part.startsWith('@')) {
            const handle = part.replace('@', '');
            return (
              <Text
                key={index}
                style={[styles.mentionText, { color: dynamicColors.accentBlue }]}
                onPress={() => {
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
                  style={[styles.linkText, { color: dynamicColors.accentBlue }]}
                  onPress={() => {
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
                {trailingPunctuation ? <Text style={{ color: dynamicColors.textPrimary }}>{trailingPunctuation}</Text> : null}
              </React.Fragment>
            );
          }
          return <Text key={index} style={{ color: dynamicColors.textPrimary }}>{part}</Text>;
        })}
      </Text>
    );
  };

  const isRoot = depth === 0 && !isReply;
  const repliesCount = comment.replies?.length || 0;

  return (
    <View
      style={[
        isRoot ? styles.rootCardContainer : styles.replyCardContainer,
        {
          backgroundColor: isRoot ? dynamicColors.cardBackground : dynamicColors.backgroundSecondary,
          borderColor: dynamicColors.borderLight,
        },
        highlighted && [
          styles.highlightedCard,
          {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#F0F9FF',
            borderColor: dynamicColors.accentBlue,
          },
        ],
        depth > 1 && { marginLeft: Math.min(depth - 1, 3) * 10 },
        style,
      ]}
    >
      {/* Top Header: Author info + Green tick + Type badge */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => handleAuthorPress(comment.author?.id)}
          style={styles.authorRow}
          activeOpacity={0.8}
        >
          <Avatar
            url={comment.author?.avatarUrl}
            name={comment.author?.fullName || 'Researcher'}
            size={isRoot ? 38 : 28}
            verified={comment.author?.orcidVerified ?? true}
          />
          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={[isRoot ? styles.authorName : styles.replyAuthorName, { color: dynamicColors.textPrimary }]}>
                {comment.author?.fullName || 'Researcher'}
              </Text>
              <Text style={[isRoot ? styles.authorHandle : styles.replyAuthorHandle, { color: dynamicColors.textSecondary }]}>
                @{comment.author?.handle || 'scholar'}
              </Text>
            </View>
            {isRoot ? (
              <Text style={[styles.authorTitle, { color: dynamicColors.textSecondary }]} numberOfLines={1}>
                {comment.author?.academicTitle || 'Student researcher'}
                {comment.author?.institution ? ` · ${comment.author.institution}` : ''}
              </Text>
            ) : (
              <Text style={[styles.replyTimestamp, { color: dynamicColors.textMuted }]}>{comment.createdAt}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Timestamp on root comment or like button on sub-reply */}
        {isRoot ? (
          <Text style={[styles.timestampText, { color: dynamicColors.textMuted }]}>{comment.createdAt}</Text>
        ) : (
          <TouchableOpacity
            onPress={handleLike}
            style={styles.replyLikeButton}
            activeOpacity={0.7}
          >
            <LikeIcon
              size={13}
              isLiked={Boolean(comment.isLiked)}
              color={comment.isLiked ? dynamicColors.textPrimary : dynamicColors.textMuted}
            />
            {comment.likesCount > 0 && (
              <Text
                style={[
                  styles.replyLikeCount,
                  { color: dynamicColors.textSecondary },
                  comment.isLiked && { color: dynamicColors.textPrimary, fontWeight: '700' },
                ]}
              >
                {comment.likesCount}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Main Formatted Content */}
      <View style={styles.contentContainer}>
        {renderFormattedContent(comment.content)}
      </View>

      {/* Bottom Action Row */}
      <View style={[isRoot ? styles.actionRow : styles.replyActionRow, isRoot && { borderTopColor: dynamicColors.borderLight }]}>
        {/* Like Button */}
        <TouchableOpacity
          onPress={handleLike}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.actionButton, comment.isLiked && styles.actionButtonActive]}
          activeOpacity={0.7}
        >
          <LikeIcon
            size={isRoot ? 15 : 13}
            isLiked={Boolean(comment.isLiked)}
            color={comment.isLiked ? dynamicColors.textPrimary : dynamicColors.textSecondary}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: dynamicColors.textSecondary },
              !isRoot && { fontSize: 11 },
              comment.isLiked && { color: dynamicColors.textPrimary, fontWeight: '700' },
            ]}
          >
            {comment.likesCount > 0 ? comment.likesCount : 'Helpful'}
          </Text>
        </TouchableOpacity>

        {/* Reply button on every comment and every nested reply */}
        <TouchableOpacity
          onPress={handleTriggerReply}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <CornerDownRight size={isRoot ? 15 : 13} color={dynamicColors.textSecondary} />
          <Text style={[styles.actionLabel, { color: dynamicColors.textSecondary }, !isRoot && { fontSize: 11 }]}>
            {repliesCount > 0
              ? `${repliesCount} ${repliesCount === 1 ? 'Reply' : 'Replies'}`
              : 'Reply'}
          </Text>
        </TouchableOpacity>

        {isRoot && (
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Share2 size={15} color={dynamicColors.textSecondary} />
          </TouchableOpacity>
        )}

        {isOwnComment && onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(comment.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Trash2 size={isRoot ? 14 : 12} color={dynamicColors.textMuted} />
          </TouchableOpacity>
        )}

        {isRoot && <Text style={[styles.timestamp, { color: dynamicColors.textMuted }]}>{comment.createdAt}</Text>}
      </View>

      {/* Inline Reply Composer for this specific comment / reply */}
      {isInlineReplying && (
        <View style={[styles.replyComposerContainer, { backgroundColor: dynamicColors.cardBackground, borderColor: dynamicColors.borderLight }]}>
          <Avatar
            url={currentUser?.avatarUrl}
            name={currentUser?.fullName || 'Me'}
            size={26}
          />
          <TextInput
            placeholder={`Reply to @${comment.author?.handle || 'scholar'}...`}
            placeholderTextColor={dynamicColors.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            style={[styles.replyInput, { color: dynamicColors.textPrimary }]}
            multiline
            autoFocus
          />
          <TouchableOpacity
            onPress={handleSendInlineReply}
            disabled={!replyText.trim()}
            style={[
              styles.replySendButton,
              { backgroundColor: dynamicColors.primary },
              !replyText.trim() && styles.replySendButtonDisabled,
            ]}
          >
            <Send size={12} color={dynamicColors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Recursive Continuous Nested Replies Chain */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesList}>
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onAddReply={onAddReply}
              onLike={onLike}
              onLikeReply={onLikeReply}
              onDelete={onDelete}
              currentUserId={currentUserId}
              currentUser={currentUser}
              isReply
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootCardContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  replyCardContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginTop: spacing.xs + 2,
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
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  authorMeta: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  authorName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
  },
  authorHandle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
  },
  replyAuthorName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  replyAuthorHandle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
  },
  authorTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  replyTimestamp: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    gap: 4,
  },
  timestampText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  contentContainer: {
    marginVertical: spacing.xs + 2,
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 20,
  },
  mentionText: {
    color: colors.accentBlue,
    fontWeight: '600',
  },
  linkText: {
    color: colors.accentBlue,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  replyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    marginTop: 2,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionButtonActive: {
    opacity: 0.9,
  },
  actionLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  timestamp: {
    ...typography.micro,
    color: colors.textMuted,
    marginLeft: 'auto',
    fontSize: 11,
  },
  replyLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 4,
  },
  replyLikeCount: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  replyComposerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.xs + 2,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  replyInput: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    fontSize: 12.5,
    maxHeight: 70,
  },
  replySendButton: {
    backgroundColor: colors.black,
    padding: 6,
    borderRadius: radii.full,
  },
  replySendButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  repliesList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  highlightedCard: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    backgroundColor: '#F0F9FF',
    borderRadius: radii.md,
  },
});
