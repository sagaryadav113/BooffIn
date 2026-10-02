import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { DiscussionIcon } from '../../components/core/DiscussionIcon';
import { PostCard } from '../../components/cards/PostCard';
import { CommentCard } from '../../components/cards/CommentCard';
import { DiscussionComposer, DiscussionTypePills } from '../../components/discussion';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ResearchArticleView } from '../../components/article/ResearchArticleView';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Comment, DiscussionType, Post } from '../../types';
import { supabase } from '../../api/client';
import { mapSupabasePost, populatePollVotes } from '../../api/socialService';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = id || '';

  const getPostById = usePostStore((s) => s.getPostById);
  const getCommentsForPost = usePostStore((s) => s.getCommentsForPost);
  const commentsMap = usePostStore((s) => s.comments);
  const fetchCommentsForPost = usePostStore((s) => s.fetchCommentsForPost);
  const addComment = usePostStore((s) => s.addComment);
  const deleteComment = usePostStore((s) => s.deleteComment);
  const toggleLikeComment = usePostStore((s) => s.toggleLikeComment);
  const currentUser = useAuthStore((s) => s.user);

  const [activeFilter, setActiveFilter] = useState<'all' | DiscussionType>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [post, setPost] = useState<Post | null>(getPostById(postId) || null);
  const [isLoading, setIsLoading] = useState(!post);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const comments = useMemo(() => {
    return postId ? getCommentsForPost(postId) : [];
  }, [postId, commentsMap, getCommentsForPost]);

  const loadPostData = useCallback(async (isRefresh = false) => {
    if (!postId) {
      setIsLoading(false);
      return;
    }

    if (!isRefresh && !post) {
      setIsLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!author_id (
            id,
            username,
            full_name,
            avatar_url,
            academic_title,
            institution,
            orcid_id,
            orcid_verified
          ),
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
        const mappedPost = mapSupabasePost(data, currentUser?.id);
        const [postWithVotes] = await populatePollVotes([mappedPost], currentUser?.id);
        setPost(postWithVotes || mappedPost);
      }
    } catch {}
    await fetchCommentsForPost(postId, currentUser?.id);
    setIsLoading(false);
    if (isRefresh) setIsRefreshing(false);
  }, [postId, currentUser?.id, fetchCommentsForPost]);

  useEffect(() => {
    loadPostData();
  }, [loadPostData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadPostData(true);
  };

  const storePost = usePostStore((s) => s.getPostById(postId));
  const activePost = storePost || post;

  // Total discussions including all recursive nested replies
  const totalDiscussionCount = useMemo(() => {
    const countAll = (list: Comment[]): number => {
      let total = 0;
      for (const item of list) {
        total += 1;
        if (item.replies && item.replies.length > 0) {
          total += countAll(item.replies);
        }
      }
      return total;
    };
    return countAll(comments);
  }, [comments]);

  // Filter counts calculation including recursive nested replies
  const filterCounts = useMemo(() => {
    const counts = {
      all: totalDiscussionCount,
      discussion: 0,
      question: 0,
      insight: 0,
      methodology: 0,
    };
    const countTree = (list: Comment[]) => {
      list.forEach((c) => {
        const textLower = c.content.toLowerCase();
        if (textLower.startsWith('[question]') || textLower.includes('?')) {
          counts.question += 1;
        } else if (textLower.startsWith('[insight]') || textLower.includes('hypothesis') || textLower.includes('insight')) {
          counts.insight += 1;
        } else if (textLower.startsWith('[methodology]') || textLower.includes('protocol') || textLower.includes('method')) {
          counts.methodology += 1;
        } else {
          counts.discussion += 1;
        }
        if (c.replies && c.replies.length > 0) {
          countTree(c.replies);
        }
      });
    };
    countTree(comments);
    return counts;
  }, [comments, totalDiscussionCount]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    if (activeFilter === 'all') return comments;
    return comments.filter((c) => {
      const textLower = c.content.toLowerCase();
      if (activeFilter === 'question') {
        return textLower.startsWith('[question]') || textLower.includes('?');
      }
      if (activeFilter === 'insight') {
        return textLower.startsWith('[insight]') || textLower.includes('hypothesis') || textLower.includes('insight');
      }
      if (activeFilter === 'methodology') {
        return textLower.startsWith('[methodology]') || textLower.includes('protocol') || textLower.includes('method');
      }
      return !textLower.startsWith('[question]') && !textLower.startsWith('[insight]') && !textLower.startsWith('[methodology]') && !textLower.includes('?');
    });
  }, [comments, activeFilter]);

  const handleCreateDiscussion = async ({
    type,
    title,
    content,
  }: {
    type: DiscussionType;
    title?: string;
    content: string;
  }) => {
    if (!content.trim() || isSubmitting || !activePost) return;

    let finalContent = content.trim();
    if (title && title.trim()) {
      finalContent = `${title.trim()}\n\n${finalContent}`;
    }
    if (type !== 'discussion') {
      finalContent = `[${type}] ${finalContent}`;
    }

    setIsSubmitting(true);
    try {
      await addComment(activePost.id, finalContent, undefined, currentUser.id);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (err) {
      console.warn('[PostDetailScreen] Error creating discussion:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string, replyText: string) => {
    if (!replyText.trim() || !activePost) return;
    try {
      await addComment(activePost.id, replyText.trim(), parentId, currentUser.id);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (err) {
      console.warn('[PostDetailScreen] Error adding reply:', err);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activePost) return;
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this discussion?');
      if (confirmed) {
        deleteComment(commentId, activePost.id, currentUser.id);
      }
    } else {
      Alert.alert(
        'Delete Discussion',
        'Are you sure you want to delete this contribution?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteComment(commentId, activePost.id, currentUser.id),
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title="Discussion" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.loadingText}>Loading discussion...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activePost) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title="Discussion" showBack />
        <EmptyState
          icon="FileText"
          title="Discussion not found"
          description="This scientific discussion may have been removed or does not exist."
        />
      </SafeAreaView>
    );
  }

  if (activePost.postType === 'article' && activePost.article) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ResearchArticleView
          post={activePost}
          currentUser={currentUser}
          comments={filteredComments}
          totalDiscussionCount={totalDiscussionCount}
          activeFilter={activeFilter}
          filterCounts={filterCounts}
          onSelectFilter={setActiveFilter}
          onSubmitDiscussion={handleCreateDiscussion}
          onAddReply={handleAddReply}
          onDeleteComment={handleDeleteComment}
          onLikeComment={(cId) => toggleLikeComment(cId, activePost.id, currentUser.id)}
          onLikeReply={(_, replyId) => toggleLikeComment(replyId, activePost.id, currentUser.id)}
          isSubmittingComment={isSubmitting}
          onPostUpdated={(updated) => setPost(updated)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.black}
              colors={[colors.black]}
            />
          }
        >
          {/* Main Post Card */}
          <PostCard
            post={activePost}
            onDeleted={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            onUpdated={(updated) => setPost(updated)}
          />

          {/* Section Header */}
          <View style={styles.discussionHeader}>
            <View style={styles.discussionTitleRow}>
              <DiscussionIcon size={20} color={colors.textPrimary} />
              <Text style={styles.discussionTitleText}>Discussion</Text>
              <View style={styles.discussionCountBadge}>
                <Text style={styles.discussionCountBadgeText}>
                  {totalDiscussionCount}
                </Text>
              </View>
            </View>
            <Text style={styles.discussionSubtitleText}>
              Constructive scientific inquiry & insights
            </Text>
          </View>

          {/* Discussion Type Filter Pills */}
          <DiscussionTypePills
            activeType={activeFilter}
            counts={filterCounts}
            onSelectType={setActiveFilter}
          />

          {/* Discussion Composer Card */}
          <View style={styles.composerWrapper}>
            <DiscussionComposer
              currentUser={currentUser}
              onSubmit={handleCreateDiscussion}
              isSubmitting={isSubmitting}
            />
          </View>

          {/* Discussion List */}
          <View style={styles.discussionsList}>
            {filteredComments.length > 0 ? (
              filteredComments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onAddReply={handleAddReply}
                  onLike={(cId) => toggleLikeComment(cId, activePost.id, currentUser.id)}
                  onLikeReply={(_, replyId) => toggleLikeComment(replyId, activePost.id, currentUser.id)}
                  onDelete={handleDeleteComment}
                  currentUserId={currentUser.id}
                  currentUser={currentUser}
                />
              ))
            ) : (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="Discussion"
                  title="No discussions yet"
                  description="Start a constructive scientific discussion on this research post."
                />
              </View>
            )}
          </View>
        </ScrollView>
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
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  discussionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  discussionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 2,
  },
  discussionTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  discussionCountBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  discussionCountBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  discussionSubtitleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  composerWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  discussionsList: {
    marginTop: spacing.xs,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
  },
});
