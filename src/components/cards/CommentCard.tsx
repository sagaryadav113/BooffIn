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
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  MessageSquare,
  HelpCircle,
  Lightbulb,
  FlaskConical,
  Heart,
  CornerDownRight,
  Send,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Comment, DiscussionType, UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';

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
  style,
}) => {
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
      await Share.share({
        message: `Scientific discussion by ${comment.author?.fullName || 'Researcher'} on BooffIn:\n"${comment.content}"`,
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
    return { label: 'Discussion', icon: MessageSquare, color: colors.textPrimary, bg: colors.backgroundSecondary };
  };

  const badgeInfo = getTypeBadge();
  const IconComp = badgeInfo.icon;

  // Format mentions with clickable blue text
  const renderFormattedContent = (text: string) => {
    const cleanedText = text.replace(/^\[(question|insight|methodology|discussion)\]\s*/i, '');
    const parts = cleanedText.split(/(@[a-zA-Z0-9_]+)/g);

    return (
      <Text style={styles.bodyText}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            const handle = part.replace('@', '');
            return (
              <Text
                key={index}
                style={styles.mentionText}
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
          return <Text key={index}>{part}</Text>;
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
              <Text style={isRoot ? styles.authorName : styles.replyAuthorName}>
                {comment.author?.fullName || 'Researcher'}
              </Text>
              <Text style={isRoot ? styles.authorHandle : styles.replyAuthorHandle}>
                @{comment.author?.handle || 'scholar'}
              </Text>
            </View>
            {isRoot ? (
              <Text style={styles.authorTitle} numberOfLines={1}>
                {comment.author?.academicTitle || 'Student researcher'}
                {comment.author?.institution ? ` · ${comment.author.institution}` : ''}
              </Text>
            ) : (
              <Text style={styles.replyTimestamp}>{comment.createdAt}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Structured Discussion Type Badge on root or like button on sub-reply */}
        {isRoot ? (
          <View style={[styles.typeBadge, { backgroundColor: badgeInfo.bg }]}>
            <IconComp size={12} color={badgeInfo.color} />
            <Text style={[styles.typeBadgeLabel, { color: badgeInfo.color }]}>
              {badgeInfo.label}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleLike}
            style={styles.replyLikeButton}
            activeOpacity={0.7}
          >
            <Heart
              size={13}
              color={comment.isLiked ? colors.accentRed : colors.textMuted}
              fill={comment.isLiked ? colors.accentRed : 'transparent'}
            />
            {comment.likesCount > 0 && (
              <Text
                style={[
                  styles.replyLikeCount,
                  comment.isLiked && { color: colors.accentRed },
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
      <View style={isRoot ? styles.actionRow : styles.replyActionRow}>
        {isRoot && (
          <TouchableOpacity
            onPress={handleLike}
            style={[styles.actionButton, comment.isLiked && styles.actionButtonActive]}
            activeOpacity={0.7}
          >
            <Heart
              size={15}
              color={comment.isLiked ? colors.accentRed : colors.textSecondary}
              fill={comment.isLiked ? colors.accentRed : 'transparent'}
            />
            <Text
              style={[
                styles.actionLabel,
                comment.isLiked && { color: colors.accentRed, fontWeight: '700' },
              ]}
            >
              {comment.likesCount > 0 ? comment.likesCount : 'Helpful'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Reply button on every comment and every nested reply */}
        <TouchableOpacity
          onPress={handleTriggerReply}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <CornerDownRight size={isRoot ? 15 : 13} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, !isRoot && { fontSize: 11 }]}>
            Reply
          </Text>
        </TouchableOpacity>

        {isRoot && (
          <TouchableOpacity
            onPress={handleShare}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Share2 size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {isOwnComment && onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(comment.id)}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Trash2 size={isRoot ? 14 : 12} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {isRoot && <Text style={styles.timestamp}>{comment.createdAt}</Text>}
      </View>

      {/* Inline Reply Composer for this specific comment / reply */}
      {isInlineReplying && (
        <View style={styles.replyComposerContainer}>
          <Avatar
            url={currentUser?.avatarUrl}
            name={currentUser?.fullName || 'Me'}
            size={26}
          />
          <TextInput
            placeholder={`Reply to @${comment.author?.handle || 'scholar'}...`}
            placeholderTextColor={colors.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            style={styles.replyInput}
            multiline
            autoFocus
          />
          <TouchableOpacity
            onPress={handleSendInlineReply}
            disabled={!replyText.trim()}
            style={[
              styles.replySendButton,
              !replyText.trim() && styles.replySendButtonDisabled,
            ]}
          >
            <Send size={12} color={colors.white} />
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
  typeBadgeLabel: {
    ...typography.micro,
    fontWeight: '700',
    fontSize: 11,
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
});
