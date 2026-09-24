import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { FeedNavigation } from '../../components/layout/FeedNavigation';
import { PostCard } from '../../components/cards/PostCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePostStore } from '../../store/usePostStore';
import { Post } from '../../types';

const FEED_TABS = [
  'For You',
  'Following',
  'Neuroscience',
  'AI & Bio',
  'Genetics',
  'Cancer',
  'Immunology',
];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const posts = usePostStore((s) => s.posts);
  const activeTab = usePostStore((s) => s.activeTab);
  const setActiveTab = usePostStore((s) => s.setActiveTab);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 450);
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (activeTab === 'For You') return true;
      if (activeTab === 'Following') return true;
      if (activeTab === 'AI & Bio') {
        return post.topics.some(
          (t) =>
            t.toLowerCase().includes('ai') ||
            t.toLowerCase().includes('bioinformatics') ||
            t.toLowerCase().includes('single cell') ||
            t.toLowerCase().includes('multi-omics')
        );
      }
      return post.topics.some((t) =>
        t.toLowerCase().includes(activeTab.toLowerCase())
      );
    });
  }, [posts, activeTab]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header with BooffIn Wordmark, Search icon, and Create Button */}
      <AppHeader
        title="BooffIn"
        isBrandTitle
        showSearch
        onSearch={() => router.push('/search')}
        showCreate
        onCreatePress={() => router.push('/(tabs)/create')}
      />

      {/* Feed Navigation Tabs (For You, Following, Topics) */}
      <FeedNavigation
        tabs={FEED_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Virtualized Feed with Smooth Scrolling */}
      <FlatList
        data={filteredPosts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={5}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.black}
            colors={[colors.black]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="FileText"
            title={`No posts in ${activeTab} yet`}
            description="Be the first researcher to share a discussion, question, or paper insight in this field."
            actionTitle="Create Discussion"
            onAction={() => router.push('/(tabs)/create')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
});
