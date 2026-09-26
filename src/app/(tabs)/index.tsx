import React, { useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  RefreshControl,
  Platform,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { router } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { FeedNavigation } from '../../components/layout/FeedNavigation';
import { PostCard } from '../../components/cards/PostCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Post } from '../../types';

export default function HomeScreen() {
  const posts = usePostStore((s) => s.posts);
  const activeTab = usePostStore((s) => s.activeTab);
  const setActiveTab = usePostStore((s) => s.setActiveTab);
  const fetchFeed = usePostStore((s) => s.fetchFeed);
  const refreshFeed = usePostStore((s) => s.refreshFeed);
  const loadMoreFeed = usePostStore((s) => s.loadMoreFeed);
  const isLoading = usePostStore((s) => s.isLoading);
  const isRefreshing = usePostStore((s) => s.isRefreshing);
  const isLoadingMore = usePostStore((s) => s.isLoadingMore);
  const hasMore = usePostStore((s) => s.hasMore);
  const feedError = usePostStore((s) => s.feedError);
  const currentUser = useAuthStore((s) => s.user);

  // Dynamic feed navigation tabs: For You, Following, plus user's chosen research interests
  const userInterests = useMemo(() => {
    return Array.isArray(currentUser?.researchInterests)
      ? currentUser.researchInterests.filter((t) => typeof t === 'string' && t.trim().length > 0)
      : [];
  }, [currentUser?.researchInterests]);

  const feedTabs = useMemo(() => {
    return ['For You', 'Following', ...userInterests];
  }, [userInterests]);

  useEffect(() => {
    fetchFeed(activeTab, currentUser?.id);
  }, [activeTab, currentUser?.id]);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab, currentUser?.id);
    },
    [currentUser?.id, setActiveTab]
  );

  const handleRefresh = useCallback(() => {
    refreshFeed(currentUser?.id);
  }, [currentUser?.id, refreshFeed]);

  const handleEndReached = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      loadMoreFeed(currentUser?.id);
    }
  }, [isLoading, isLoadingMore, hasMore, currentUser?.id, loadMoreFeed]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (activeTab === 'For You') return true;
      if (activeTab === 'Following') return true;
      const tabLower = activeTab.toLowerCase();
      return Array.isArray(post.topics) && post.topics.some((t) => {
        const topicLower = t.toLowerCase();
        return topicLower.includes(tabLower) || tabLower.includes(topicLower);
      });
    });
  }, [posts, activeTab]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  };

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

      {/* Feed Navigation Tabs (For You, Following, plus User's Research Interests) */}
      <FeedNavigation
        tabs={feedTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Network / Error Notice Banner */}
      {feedError && (
        <View style={styles.errorBanner}>
          <AlertCircle size={15} color={colors.accentRed} />
          <Text style={styles.errorText}>Unable to sync feed in real-time. Showing cached posts.</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Initial Loading Spinner if empty */}
      {isLoading && filteredPosts.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={colors.black} />
        </View>
      ) : (
        /* Virtualized Feed with Smooth Scrolling & Infinite Pagination */
        <FlatList
          data={filteredPosts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={5}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== 'web'}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.black}
              colors={[colors.black]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === 'Following' ? 'Users' : 'FileText'}
              title={
                activeTab === 'Following'
                  ? 'No posts from people you follow'
                  : `No posts in ${activeTab} yet`
              }
              description={
                activeTab === 'Following'
                  ? 'Follow other researchers, PIs, and peers to see their research shares here.'
                  : 'Be the first researcher to share a discussion, question, or paper insight in this field.'
              }
              actionTitle={activeTab === 'Following' ? 'Discover Researchers' : 'Create Discussion'}
              onAction={() =>
                activeTab === 'Following'
                  ? router.push('/search')
                  : router.push('/(tabs)/create')
              }
            />
          }
        />
      )}
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
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.15)',
  },
  errorText: {
    ...typography.micro,
    color: colors.accentRed,
    flex: 1,
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  retryText: {
    ...typography.microBold,
    color: colors.accentRed,
    fontSize: 11,
  },
});
