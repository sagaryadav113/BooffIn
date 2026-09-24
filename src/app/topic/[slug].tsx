import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Button } from '../../components/core/Button';
import { Typography } from '../../components/core/Typography';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PostCard } from '../../components/cards/PostCard';
import { useTopicStore } from '../../store/useTopicStore';
import { usePostStore } from '../../store/usePostStore';

export default function TopicDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const getTopicBySlug = useTopicStore((s) => s.getTopicBySlug);
  const toggleFollowTopic = useTopicStore((s) => s.toggleFollowTopic);
  const posts = usePostStore((s) => s.posts);

  const topic = getTopicBySlug(slug || 'neuroscience') || {
    id: 'top_1',
    slug: slug || 'neuroscience',
    name: (slug || 'Neuroscience').charAt(0).toUpperCase() + (slug || 'Neuroscience').slice(1),
    description: 'Academic discourse and research publications in this field.',
    iconName: 'Brain',
    category: 'Science',
    followersCount: 125000,
    postsCount: 3400,
    isFollowing: false,
  };

  const filteredPosts = posts.filter((p) =>
    p.topics.some((t) => t.toLowerCase() === topic.name.toLowerCase() || t.toLowerCase() === topic.slug.toLowerCase())
  );

  const formatFollowers = (count: number) => {
    if (count >= 1000) return `${Math.round(count / 1000)}K`;
    return `${count}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        showBack
        title={topic.name}
        rightAction={
          <Button
            title={topic.isFollowing ? 'Following' : 'Follow'}
            variant={topic.isFollowing ? 'outline' : 'primary'}
            size="sm"
            onPress={() => toggleFollowTopic(topic.id)}
          />
        }
      />

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={
          <View style={styles.topicHeaderBanner}>
            <Typography variant="h2" style={styles.topicTitle}>
              {topic.name}
            </Typography>
            {topic.description && (
              <Typography variant="body" color={colors.textSecondary} style={styles.topicDesc}>
                {topic.description}
              </Typography>
            )}
            <View style={styles.metricsRow}>
              <Typography variant="caption" color={colors.textSecondary}>
                <Typography variant="captionBold" color={colors.textPrimary}>
                  {formatFollowers(topic.followersCount)}
                </Typography>{' '}
                Followers ·{' '}
                <Typography variant="captionBold" color={colors.textPrimary}>
                  {topic.postsCount}
                </Typography>{' '}
                Discussions
              </Typography>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="MessageSquare"
            title={`No posts in ${topic.name} yet`}
            description={`Share a paper, question, or preprint in ${topic.name} to start the academic discourse.`}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topicHeaderBanner: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topicTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  topicDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
});
