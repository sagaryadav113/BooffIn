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

  const handleLikeReplyItem = (replyId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onLikeReply) {
      onLikeReply(comment.id, replyId);
    } else if (onLike) {
      onLike(replyId);
    }
  };

  const handleSendInlineReply = () => {
    if (!replyText.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (onAddReply) {
      onAddReply(comment.id, replyText.trim());
    } else if (onReply) {
      onReply({ ...comment, content: replyText.trim() });
    }

    setReplyText('');
    setIsInlineReplying(false);
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

  const repliesCount = comment.replies?.length || 0;

  return (
    <View style={[styles.cardContainer, isReply && styles.nestedReplyContainer, style]}>
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
            size={38}
            verified={comment.author?.orcidVerified ?? true}
          />
          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{comment.author?.fullName || 'Researcher'}</Text>
              <Text style={styles.authorHandle}>@{comment.author?.handle || 'scholar'}</Text>
            </View>
            <Text style={styles.authorTitle} numberOfLines={1}>
              {comment.author?.academicTitle || 'Student researcher'}
              {comment.author?.institution ? ` · ${comment.author.institution}` : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Structured Discussion Type Badge */}
        {!isReply && (
          <View style={[styles.typeBadge, { backgroundColor: badgeInfo.bg }]}>
            <IconComp size={12} color={badgeInfo.color} />
            <Text style={[styles.typeBadgeLabel, { color: badgeInfo.color }]}>
              {badgeInfo.label}
            </Text>
          </View>
        )}
      </View>

      {/* Main Formatted Content */}
      <View style={styles.contentContainer}>
        {renderFormattedContent(comment.content)}
      </View>

      {/* Bottom Action Row */}
      <View style={styles.actionRow}>
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

        <TouchableOpacity
          onPress={() => {
            if (onReply) {
              onReply(comment);
            } else {
              setIsInlineReplying(!isInlineReplying);
              if (!isInlineReplying) {
                setReplyText(`@${comment.author?.handle || 'researcher'} `);
              }
            }
          }}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <CornerDownRight size={15} color={colors.textSecondary} />
          <Text style={styles.actionLabel}>
            {repliesCount > 0
              ? `${repliesCount} ${repliesCount === 1 ? 'Reply' : 'Replies'}`
              : 'Reply'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Share2 size={15} color={colors.textSecondary} />
        </TouchableOpacity>

        {isOwnComment && onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(comment.id)}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <Text style={styles.timestamp}>{comment.createdAt}</Text>
      </View>

      {/* Inline Reply Composer */}
      {isInlineReplying && (
        <View style={styles.replyComposerContainer}>
          <Avatar
            url={currentUser?.avatarUrl}
            name={currentUser?.fullName || 'Me'}
            size={28}
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
            <Send size={13} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Nested Threaded Replies List (Subcards) */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesList}>
          {comment.replies.map((reply) => (
            <View key={reply.id} style={styles.replyCard}>
              <View style={styles.replyHeader}>
                <TouchableOpacity
                  onPress={() => handleAuthorPress(reply.author?.id)}
                  style={styles.replyAuthorRow}
                  activeOpacity={0.8}
                >
                  <Avatar
                    url={reply.author?.avatarUrl}
                    name={reply.author?.fullName || 'Researcher'}
                    size={26}
                    verified={reply.author?.orcidVerified ?? true}
                  />
                  <View>
                    <View style={styles.replyNameRow}>
                      <Text style={styles.replyAuthorName}>
                        {reply.author?.fullName || 'Researcher'}
                      </Text>
                      <Text style={styles.replyAuthorHandle}>
                        @{reply.author?.handle || 'scholar'}
                      </Text>
                    </View>
                    <Text style={styles.replyTimestamp}>{reply.createdAt}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleLikeReplyItem(reply.id)}
                  style={styles.replyLikeButton}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={13}
                    color={reply.isLiked ? colors.accentRed : colors.textMuted}
                    fill={reply.isLiked ? colors.accentRed : 'transparent'}
                  />
                  {reply.likesCount > 0 && (
                    <Text
                      style={[
                        styles.replyLikeCount,
                        reply.isLiked && { color: colors.accentRed },
                      ]}
                    >
                      {reply.likesCount}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.replyContent}>
                {renderFormattedContent(reply.content)}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
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
  nestedReplyContainer: {
    marginHorizontal: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
    backgroundColor: 'transparent',
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
  authorTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
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
  replyComposerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  replyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  replyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  replyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  replyTimestamp: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 10,
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
  replyContent: {
    marginTop: 2,
  },
});
