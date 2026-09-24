import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Avatar } from '../../components/core/Avatar';
import { Typography } from '../../components/core/Typography';
import { Icon } from '../../components/core/Icon';
import { PostCard } from '../../components/cards/PostCard';
import { CommentCard } from '../../components/cards/CommentCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Comment } from '../../types';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getPostById = usePostStore((s) => s.getPostById);
  const getCommentsForPost = usePostStore((s) => s.getCommentsForPost);
  const addComment = usePostStore((s) => s.addComment);
  const currentUser = useAuthStore((s) => s.user);

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const post = getPostById(id || 'post_1');
  const comments = post ? getCommentsForPost(post.id) : [];

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Discussion" showBack />
        <EmptyState
          icon="FileText"
          title="Post not found"
          description="This research discussion may have been deleted or moved."
        />
      </SafeAreaView>
    );
  }

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim(), replyingTo?.id);
    setCommentText('');
    setReplyingTo(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader title="Discussion" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Post Card */}
          <PostCard post={post} />

          {/* Comments Section Header */}
          <View style={styles.sectionHeader}>
            <Typography variant="captionBold" color={colors.textPrimary}>
              Critiques & Discussion ({comments.length})
            </Typography>
          </View>

          {/* Comments List */}
          <View style={styles.commentsList}>
            {comments.length > 0 ? (
              comments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onReply={(target) => setReplyingTo(target)}
                />
              ))
            ) : (
              <EmptyState
                icon="MessageCircle"
                title="No comments yet"
                description="Share your constructive critique, question, or replication note."
              />
            )}
          </View>
        </ScrollView>

        {/* Reply Bar */}
        <View style={styles.bottomBar}>
          {replyingTo && (
            <View style={styles.replyingToBar}>
              <Typography variant="micro" color={colors.textSecondary}>
                Replying to <Typography variant="microBold" color={colors.textPrimary}>@{replyingTo.author.handle}</Typography>
              </Typography>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Typography variant="micro" color={colors.accentRed} style={{ fontWeight: '600' }}>
                  Cancel
                </Typography>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <Avatar
              url={currentUser.avatarUrl}
              name={currentUser.fullName}
              size={32}
              style={{ marginRight: spacing.sm }}
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Post a constructive critique or reply..."
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!commentText.trim()}
              style={[
                styles.sendButton,
                commentText.trim() ? styles.sendButtonActive : styles.sendButtonDisabled,
              ]}
            >
              <Icon name="Send" size="xs" color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  commentsList: {
    paddingHorizontal: spacing.lg,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 80,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonActive: {
    backgroundColor: colors.black,
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderDark,
    opacity: 0.5,
  },
});
