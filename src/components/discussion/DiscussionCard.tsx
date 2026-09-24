import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
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
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionContribution, DiscussionReply, DiscussionType, UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';
import { Badge } from '../core/Badge';

export interface DiscussionCardProps {
  discussion: DiscussionContribution;
  currentUser: UserProfile;
  onLike: (discussionId: string) => void;
  onLikeReply: (discussionId: string, replyId: string) => void;
  onAddReply: (discussionId: string, content: string) => void;
}

export const DiscussionCard: React.FC<DiscussionCardProps> = ({
  discussion,
  currentUser,
  onLike,
  onLikeReply,
  onAddReply,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [repliesExpanded, setRepliesExpanded] = useState(true);

  const handleAuthorPress = (userId: string) => {
    router.push({
      pathname: '/profile/[id]',
      params: { id: userId },
    });
  };

  const handleLike = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onLike(discussion.id);
  };

  const handleLikeReply = (replyId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onLikeReply(discussion.id, replyId);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onAddReply(discussion.id, replyText.trim());
    setReplyText('');
    setIsReplying(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Scientific ${discussion.type} by ${discussion.author.fullName} on BooffIn:\n"${discussion.content}"`,
      });
    } catch {}
  };

  const getTypeBadge = (type: DiscussionType) => {
    switch (type) {
      case 'question':
        return { label: 'Question', icon: HelpCircle, color: colors.accentBlue, bg: 'rgba(2, 132, 199, 0.08)' };
      case 'insight':
        return { label: 'Insight', icon: Lightbulb, color: colors.journalScience, bg: 'rgba(217, 119, 6, 0.08)' };
      case 'methodology':
        return { label: 'Methodology', icon: FlaskConical, color: colors.accentGreen, bg: 'rgba(16, 185, 129, 0.08)' };
      default:
        return { label: 'Discussion', icon: MessageSquare, color: colors.textPrimary, bg: colors.backgroundSecondary };
    }
  };

  const badgeInfo = getTypeBadge(discussion.type);
  const IconComp = badgeInfo.icon;

  // Render text with clickable mentions
  const renderFormattedContent = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
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

  return (
    <View style={styles.cardContainer}>
      {/* Header: Author meta + Type badge */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => handleAuthorPress(discussion.author.id)}
          style={styles.authorRow}
          activeOpacity={0.8}
        >
          <Avatar
            url={discussion.author.avatarUrl}
            name={discussion.author.fullName}
            size={38}
            verified={discussion.author.orcidVerified}
          />
          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{discussion.author.fullName}</Text>
              <Text style={styles.authorHandle}>@{discussion.author.handle}</Text>
            </View>
            <Text style={styles.authorTitle} numberOfLines={1}>
              {discussion.author.academicTitle} · {discussion.author.institution}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Structured Discussion Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: badgeInfo.bg }]}>
          <IconComp size={12} color={badgeInfo.color} />
          <Text style={[styles.typeBadgeLabel, { color: badgeInfo.color }]}>
            {badgeInfo.label}
          </Text>
        </View>
      </View>

      {/* Optional Title for Question / Insight */}
      {discussion.title && (
        <Text style={styles.discussionTitle}>{discussion.title}</Text>
      )}

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {renderFormattedContent(discussion.content)}
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleLike}
          style={[styles.actionButton, discussion.isLiked && styles.actionButtonActive]}
          activeOpacity={0.7}
        >
          <Heart
            size={15}
            color={discussion.isLiked ? colors.accentRed : colors.textSecondary}
            fill={discussion.isLiked ? colors.accentRed : 'transparent'}
          />
          <Text
            style={[
              styles.actionLabel,
              discussion.isLiked && { color: colors.accentRed, fontWeight: '700' },
            ]}
          >
            {discussion.likesCount > 0 ? discussion.likesCount : 'Helpful'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setIsReplying(!isReplying);
            if (!isReplying) {
              setReplyText(`@${discussion.author.handle} `);
            }
          }}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <CornerDownRight size={15} color={colors.textSecondary} />
          <Text style={styles.actionLabel}>
            {discussion.repliesCount > 0
              ? `${discussion.repliesCount} ${discussion.repliesCount === 1 ? 'Reply' : 'Replies'}`
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

        <Text style={styles.timestamp}>{discussion.createdAt}</Text>
      </View>

      {/* Inline Reply Composer */}
      {isReplying && (
        <View style={styles.replyComposerContainer}>
          <Avatar url={currentUser.avatarUrl} name={currentUser.fullName} size={28} />
          <TextInput
            placeholder={`Reply to @${discussion.author.handle}...`}
            placeholderTextColor={colors.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            style={styles.replyInput}
            multiline
            autoFocus
          />
          <TouchableOpacity
            onPress={handleSendReply}
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

      {/* Nested Threaded Replies */}
      {discussion.replies && discussion.replies.length > 0 && (
        <View style={styles.repliesList}>
          {discussion.replies.map((reply) => (
            <View key={reply.id} style={styles.replyCard}>
              <View style={styles.replyHeader}>
                <TouchableOpacity
                  onPress={() => handleAuthorPress(reply.author.id)}
                  style={styles.replyAuthorRow}
                >
                  <Avatar
                    url={reply.author.avatarUrl}
                    name={reply.author.fullName}
                    size={26}
                    verified={reply.author.orcidVerified}
                  />
                  <View>
                    <View style={styles.replyNameRow}>
                      <Text style={styles.replyAuthorName}>{reply.author.fullName}</Text>
                      <Text style={styles.replyAuthorHandle}>@{reply.author.handle}</Text>
                    </View>
                    <Text style={styles.replyTimestamp}>{reply.createdAt}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleLikeReply(reply.id)}
                  style={styles.replyLikeButton}
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
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
    fontSize: 13,
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
  discussionTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    marginTop: spacing.xs,
    marginBottom: 4,
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
    backgroundColor: colors.backgroundSecondary,
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
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
    gap: spacing.sm,
  },
  replyCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    padding: spacing.sm,
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
