import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Comment } from '../../types';
import { Avatar } from '../core/Avatar';
import { Typography } from '../core/Typography';
import { Icon } from '../core/Icon';
import { Trash2 } from 'lucide-react-native';

export interface CommentCardProps {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string;
  isReply?: boolean;
  style?: ViewStyle;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onReply,
  onDelete,
  currentUserId,
  isReply = false,
  style,
}) => {
  const isOwnComment = Boolean(
    currentUserId &&
      (comment.author.id === currentUserId ||
        (comment.author.id === 'usr_me' && currentUserId === 'usr_me'))
  );

  return (
    <View
      style={[
        styles.container,
        isReply && styles.replyContainer,
        style,
      ]}
    >
      <View style={styles.header}>
        <Avatar
          url={comment.author.avatarUrl}
          name={comment.author.fullName}
          size={32}
          verified={comment.author.orcidVerified}
        />
        <View style={styles.authorMeta}>
          <Typography variant="captionBold" color={colors.textPrimary}>
            {comment.author.fullName}
          </Typography>
          <Typography variant="micro" color={colors.textSecondary}>
            @{comment.author.handle} · {comment.createdAt}
          </Typography>
        </View>

        {isOwnComment && onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(comment.id)}
            style={styles.deleteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Typography variant="body" color={colors.textPrimary} style={styles.content}>
        {comment.content}
      </Typography>

      <View style={styles.actionsRow}>
        {onReply && (
          <TouchableOpacity
            onPress={() => onReply(comment)}
            style={styles.replyButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Icon name="ArrowRight" size="xs" color={colors.textSecondary} />
            <Typography variant="micro" color={colors.textSecondary} style={{ fontWeight: '600' }}>
              Reply
            </Typography>
          </TouchableOpacity>
        )}

        {isOwnComment && onDelete && !onReply && (
          <TouchableOpacity
            onPress={() => onDelete(comment.id)}
            style={styles.deleteTextButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Typography variant="micro" color={colors.accentRed} style={{ fontWeight: '600' }}>
              Delete
            </Typography>
          </TouchableOpacity>
        )}
      </View>

      {/* Nested Replies Recursion */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesWrapper}>
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              currentUserId={currentUserId}
              isReply
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  replyContainer: {
    paddingLeft: spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginTop: spacing.sm,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorMeta: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  deleteButton: {
    padding: spacing.xs,
    opacity: 0.8,
  },
  deleteTextButton: {
    marginLeft: 'auto',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs + 2,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repliesWrapper: {
    marginTop: spacing.xs,
  },
});
