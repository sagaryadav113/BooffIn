import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Comment } from '../../types';
import { Avatar } from '../core/Avatar';
import { Typography } from '../core/Typography';
import { Icon } from '../core/Icon';

export interface CommentCardProps {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  isReply?: boolean;
  style?: ViewStyle;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onReply,
  isReply = false,
  style,
}) => {
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
      </View>

      <Typography variant="body" color={colors.textPrimary} style={styles.content}>
        {comment.content}
      </Typography>

      {onReply && (
        <View style={styles.actionsRow}>
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
        </View>
      )}

      {/* Nested Replies Recursion */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesWrapper}>
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReply={onReply}
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
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
