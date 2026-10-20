import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Flame,
  Clock,
  Hash,
  Share2,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { PostCard } from '../../components/cards/PostCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { fetchPostsByHashtag } from '../../api/trendingService';
import { HashtagDetailData } from '../../types/trending';
import { Post } from '../../types/post';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../api/client';

type SortTab = 'top' | 'latest';

export default function HashtagFeedScreen() {
  const colors = useColors();
  const isDark = useIsDark();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const params = useLocalSearchParams<{ tag?: string }>();
  const rawTagParam = params.tag || 'Science';
  const cleanTag = useMemo(() => rawTagParam.replace(/^#/, '').trim(), [rawTagParam]);
  const displayTag = `#${cleanTag}`;

  const currentUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<SortTab>('top');
  const [data, setData] = useState<HashtagDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load posts for this hashtag from real Supabase backend
  const loadPosts = useCallback(
    async (sort: SortTab = activeTab, isRefresh = false) => {
      if (!isRefresh && !data) {
        setIsLoading(true);
      }
      try {
        const result = await fetchPostsByHashtag(cleanTag, sort);
        setData(result);
      } catch (err) {
        console.warn('[HashtagFeedScreen] Error loading hashtag posts:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [cleanTag, activeTab, data]
  );

  useEffect(() => {
    loadPosts(activeTab);

    // Setup real-time listener on posts table for live hashtag discussions
    const channel = supabase
      .channel(`hashtag_realtime_${cleanTag}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          loadPosts(activeTab, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanTag, activeTab, loadPosts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadPosts(activeTab, true);
  };

  const handleTabChange = (tab: SortTab) => {
    if (tab === activeTab) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveTab(tab);
  };

  const handleShare = async () => {
    try {
      Haptics.selectionAsync();
      await Share.share({
        title: `${displayTag} on BoffIn`,
        message: `Check out trending discussions on ${displayTag} on BoffIn: Scientific Network`,
      });
    } catch {}
  };

  const handleCreatePost = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    router.push({
      pathname: '/(tabs)/create',
      params: { initialContent: `${displayTag} ` },
    });
  };

  const renderHeader = () => {
    if (!data) return null;

    return (
      <View style={styles.bannerContainer}>
        {/* Category & Rank Line */}
        <View style={styles.metaRow}>
          <View style={styles.rankPill}>
            <Text style={styles.rankPillText}>
              {data.rank ? `#${data.rank} Trending in ${data.category}` : data.category}
            </Text>
          </View>
        </View>

        {/* Main Hashtag Title */}
        <View style={styles.titleRow}>
          <Text style={styles.mainTitle}>{displayTag}</Text>
        </View>

        {/* Volume Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {data.postsCount24h.toLocaleString()} {data.postsCount24h === 1 ? 'discussion' : 'discussions'}
            {data.authorsCount24h > 1
              ? ` · ${data.authorsCount24h} researchers`
              : data.authorsCount24h === 1
              ? ' · 1 researcher'
              : ''}
          </Text>
          {data.postsCount24h > 0 && (
            <View style={styles.timeTag}>
              <Sparkles size={10} color={isDark ? '#34D399' : '#1B4D3E'} />
              <Text style={styles.timeTagText}>Live</Text>
            </View>
          )}
        </View>

        {/* Twitter-style Filter Tabs: Top vs Latest */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleTabChange('top')}
            style={[styles.tabButton, activeTab === 'top' && styles.tabButtonActive]}
          >
            <Flame
              size={15}
              color={activeTab === 'top' ? (isDark ? '#34D399' : '#1B4D3E') : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'top' && styles.tabTextActive,
              ]}
            >
              Top Discussions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleTabChange('latest')}
            style={[styles.tabButton, activeTab === 'latest' && styles.tabButtonActive]}
          >
            <Clock
              size={15}
              color={activeTab === 'latest' ? (isDark ? '#34D399' : '#1B4D3E') : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'latest' && styles.tabTextActive,
              ]}
            >
              Latest
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const posts = data?.posts || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Top Navigation Bar */}
      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={() => {
            try {
              Haptics.selectionAsync();
            } catch {}
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/explore');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.navButton}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {displayTag}
          </Text>
          <Text style={styles.navSubtitle} numberOfLines={1}>
            {data ? `${data.postsCount24h.toLocaleString()} discussions` : 'Trending Topic'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.navButton}
        >
          <Share2 size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Feed Area */}
      {isLoading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandGreen} />
          <Text style={styles.loadingText}>Fetching trending posts for {displayTag}...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brandGreen}
              colors={[colors.brandGreen]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.postWrapper}>
              <PostCard post={item} />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="MessageSquare"
              title={`No discussions with ${displayTag} yet`}
              description={`Be the first researcher to share an insight, preprint, or question with ${displayTag}.`}
              actionTitle={`Post with ${displayTag}`}
              onAction={handleCreatePost}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    navbar: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.background,
    },
    navButton: {
      width: 38,
      height: 38,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitleContainer: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 10,
    },
    navTitle: {
      ...typography.h3,
      fontSize: 16.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    navSubtitle: {
      ...typography.caption,
      fontSize: 11.5,
      color: colors.textSecondary,
      marginTop: 1,
    },
    listContent: {
      paddingBottom: 90,
      backgroundColor: colors.background,
    },
    bannerContainer: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: colors.backgroundCard,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    rankPill: {
      backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    rankPillText: {
      ...typography.caption,
      fontSize: 11.5,
      fontWeight: '700',
      color: isDark ? '#34D399' : '#475569',
    },
    titleRow: {
      marginBottom: 6,
    },
    mainTitle: {
      ...typography.h1,
      fontSize: 26,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    statsText: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EAF3EE',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    timeTagText: {
      ...typography.caption,
      fontSize: 10.5,
      fontWeight: '700',
      color: isDark ? '#34D399' : '#1B4D3E',
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      marginTop: 4,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      gap: 6,
      borderBottomWidth: 2.5,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: isDark ? '#34D399' : '#1B4D3E',
    },
    tabText: {
      ...typography.body,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: isDark ? '#34D399' : '#1B4D3E',
      fontWeight: '800',
    },
    postWrapper: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.backgroundCard,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    loadingText: {
      ...typography.body,
      fontSize: 13.5,
      color: colors.textSecondary,
      marginTop: 12,
    },
  });
