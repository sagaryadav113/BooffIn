import React, { useState, useEffect } from 'react';
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
  Alert,
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
import { Comment, Post } from '../../types';
import { supabase } from '../../api/client';
import { mapSupabasePost } from '../../api/socialService';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = id || '';

  const getPostById = usePostStore((s) => s.getPostById);
  const getCommentsForPost = usePostStore((s) => s.getCommentsForPost);
  const fetchCommentsForPost = usePostStore((s) => s.fetchCommentsForPost);
  const addComment = usePostStore((s) => s.addComment);
  const deleteComment = usePostStore((s) => s.deleteComment);
  const currentUser = useAuthStore((s) => s.user);

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [post, setPost] = useState<Post | null>(getPostById(postId) || null);
  const [isLoading, setIsLoading] = useState(!post);

  useEffect(() => {
    async function loadPost() {
      if (!postId) {
        setIsLoading(false);
        return;
      }

      if (!post) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('posts')
            .select(`
              *,
              author:profiles!author_id (*),
              paper:papers!paper_id (
                *,
                paper_authors (*)
              ),
              post_topics ( topic:topics!topic_id (*) ),
              likes!left ( user_id ),
              reposts!left ( user_id ),
              bookmarks!left ( user_id )
            `)
            .eq('id', postId)
            .maybeSingle();

          if (data && !error) {
            const mappedPost = mapSupabasePost(data, currentUser.id);
            setPost(mappedPost);
          }
        } catch {}
        setIsLoading(false);
      }

      fetchCommentsForPost(postId, currentUser.id);
    }

    loadPost();
  }, [postId, currentUser.id]);

  const comments = post ? getCommentsForPost(post.id) : [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Discussion" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" color={colors.textSecondary}>Loading discussion...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Discussion" showBack />
        <EmptyState
          icon="FileText"
          title="Post not found"
          description="This research discussion may have been deleted or does not exist."
        />
      </SafeAreaView>
    );
  }

  const handleSendComment = async () => {
    if (!commentText.trim() || isSubmitting) return;

    const textToSend = commentText.trim();
    setCommentText('');
    const targetParentId = replyingTo?.id;
    setReplyingTo(null);

    setIsSubmitting(true);
    await addComment(post.id, textToSend, targetParentId, currentUser.id);
    setIsSubmitting(false);
  };

  const handleDeleteComment = (commentId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this comment?');
      if (confirmed) {
        deleteComment(commentId, post.id, currentUser.id);
      }
    } else {
      Alert.alert(
        'Delete Comment',
        'Are you sure you want to delete this critique?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteComment(commentId, post.id, currentUser.id),
          },
        ]
      );
    }
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
                  onDelete={handleDeleteComment}
                  currentUserId={currentUser.id}
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
              editable={!isSubmitting}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!commentText.trim() || isSubmitting}
              style={[
                styles.sendButton,
                commentText.trim() && !isSubmitting
                  ? styles.sendButtonActive
                  : styles.sendButtonDisabled,
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
