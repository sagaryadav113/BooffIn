import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Flame,
  Share2,
  MessageSquare,
  Users,
  Compass,
  Check,
  Plus,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Badge } from '../../components/core/Badge';
import { Typography } from '../../components/core/Typography';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PostCard } from '../../components/cards/PostCard';
import { PaperCard } from '../../components/cards/PaperCard';
import { ResearcherCard } from '../../components/cards/ResearcherCard';
import { useTopicStore } from '../../store/useTopicStore';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchTopicPageData, TopicPageData } from '../../api/topicService';

type TopicTab = 'trending' | 'shares' | 'discussions' | 'researchers';

export default function TopicDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topicSlug = slug || 'neuroscience';

  const currentUser = useAuthStore((s) => s.user);
  const toggleFollowTopic = useTopicStore((s) => s.toggleFollowTopic);
  const getTopicBySlug = useTopicStore((s) => s.getTopicBySlug);

  const [activeTab, setActiveTab] = useState<TopicTab>('trending');
  const [data, setData] = useState<TopicPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const storeTopic = getTopicBySlug(topicSlug);

  const loadTopicData = async () => {
    try {
      const pageData = await fetchTopicPageData(topicSlug, currentUser?.id);
      setData(pageData);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTopicData();
  }, [topicSlug, currentUser?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTopicData();
  };

  const currentTopic = storeTopic || data?.topic || {
    id: 'top_1',
    slug: topicSlug,
    name: topicSlug.charAt(0).toUpperCase() + topicSlug.slice(1),
    description: 'Academic discourse and peer-reviewed research in this field.',
    iconName: 'Brain',
    category: 'Science',
    followersCount: 125000,
    postsCount: 3400,
    isFollowing: false,
  };

  const handleToggleFollow = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await toggleFollowTopic(currentTopic.id, currentUser?.id);
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${Math.round(count / 1000)}K`;
    return `${count}`;
  };

  const tabs: Array<{
    id: TopicTab;
    label: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    count: number;
  }> = [
    {
      id: 'trending',
      label: 'Trending Research',
      icon: Flame,
      count: data?.trendingResearch.length || 0,
    },
    {
      id: 'shares',
      label: 'Research Shares',
      icon: Share2,
      count: data?.recentResearchShares.length || 0,
    },
    {
      id: 'discussions',
      label: 'Discussions',
      icon: MessageSquare,
      count: data?.discussions.length || 0,
    },
    {
      id: 'researchers',
      label: 'Researchers',
      icon: Users,
      count: data?.interestedResearchers.length || 0,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        showBack
        title={currentTopic.name}
        rightAction={
          <TouchableOpacity
            onPress={handleToggleFollow}
            style={[
              styles.headerFollowBtn,
              currentTopic.isFollowing && styles.headerFollowingBtn,
            ]}
            activeOpacity={0.8}
          >
            {currentTopic.isFollowing ? (
              <>
                <Check size={13} color={colors.textPrimary} />
                <Text style={styles.headerFollowingText}>Following</Text>
              </>
            ) : (
              <>
                <Plus size={13} color={colors.white} />
                <Text style={styles.headerFollowText}>Follow</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ================================================================ */}
        {/* TOPIC BANNER */}
        {/* ================================================================ */}
        <View style={styles.topicHeaderBanner}>
          <View style={styles.categoryBadgeRow}>
            <Badge label={currentTopic.category || 'Science'} variant="generic" />
          </View>

          <Typography variant="titleSerif" style={styles.topicTitle}>
            {currentTopic.name}
          </Typography>

          {currentTopic.description && (
            <Typography variant="body" color={colors.textSecondary} style={styles.topicDesc}>
              {currentTopic.description}
            </Typography>
          )}

          {/* Followers and Discussions Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Typography variant="captionBold" color={colors.textPrimary}>
                {formatFollowers(currentTopic.followersCount)}
              </Typography>
              <Typography variant="caption" color={colors.textSecondary}>
                Followers
              </Typography>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Typography variant="captionBold" color={colors.textPrimary}>
                {currentTopic.postsCount || (data?.trendingResearch.length || 0) + (data?.discussions.length || 0)}
              </Typography>
              <Typography variant="caption" color={colors.textSecondary}>
                Research & Discussions
              </Typography>
            </View>
          </View>
        </View>

        {/* ================================================================ */}
        {/* STRUCTURED TABS (TRENDING, SHARES, DISCUSSIONS, RESEARCHERS) */}
        {/* ================================================================ */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const IconComp = tab.icon;
              const iconColor = isActive ? colors.white : colors.textSecondary;

              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setActiveTab(tab.id);
                  }}
                  activeOpacity={0.8}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                >
                  <IconComp size={14} color={iconColor} />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                  {tab.count > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ================================================================ */}
        {/* TAB CONTENT STREAM */}
        {/* ================================================================ */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
            <Typography variant="micro" color={colors.textSecondary} style={{ marginTop: 8 }}>
              Loading {currentTopic.name} research...
            </Typography>
          </View>
        ) : (
          <View style={styles.tabContentContainer}>
            {/* 1. TRENDING RESEARCH */}
            {activeTab === 'trending' && (
              <View style={styles.listSection}>
                {data && data.trendingResearch.length > 0 ? (
                  data.trendingResearch.map((paper) => (
                    <PaperCard key={paper.id} paper={paper} style={styles.paperCardItem} />
                  ))
                ) : (
                  <EmptyState
                    icon="FileText"
                    title={`No research indexed in ${currentTopic.name} yet`}
                    description="Share a DOI or publisher reference to establish the first research landmark in this topic."
                  />
                )}
              </View>
            )}

            {/* 2. RECENT RESEARCH SHARES */}
            {activeTab === 'shares' && (
              <View style={styles.listSection}>
                {data && data.recentResearchShares.length > 0 ? (
                  data.recentResearchShares.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <EmptyState
                    icon="Share2"
                    title={`No research shares in ${currentTopic.name}`}
                    description="Be the first to share an impactful paper or preprint breakdown with your peers."
                  />
                )}
              </View>
            )}

            {/* 3. DISCUSSIONS & QUESTIONS */}
            {activeTab === 'discussions' && (
              <View style={styles.listSection}>
                {data && data.discussions.length > 0 ? (
                  data.discussions.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <EmptyState
                    icon="MessageSquare"
                    title={`No discussions in ${currentTopic.name} yet`}
                    description="Ask a question, share an insight, or start a methodology debate."
                  />
                )}
              </View>
            )}

            {/* 4. RESEARCHERS INTERESTED IN THIS TOPIC */}
            {activeTab === 'researchers' && (
              <View style={styles.researchersList}>
                {data && data.interestedResearchers.length > 0 ? (
                  data.interestedResearchers.map((researcher) => (
                    <ResearcherCard
                      key={researcher.id}
                      researcher={researcher}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="Users"
                    title="No researchers found"
                    description={`Follow ${currentTopic.name} to be listed among the active scientists in this field.`}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerFollowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.full,
    gap: 4,
  },
  headerFollowingBtn: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerFollowText: {
    ...typography.micro,
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  headerFollowingText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl * 1.5,
  },
  topicHeaderBanner: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  categoryBadgeRow: {
    marginBottom: spacing.xs,
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  topicDesc: {
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.md,
  },
  tabsWrapper: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabsScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  tabLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  tabLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundTertiary,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  tabBadgeTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentContainer: {
    paddingTop: spacing.xs,
  },
  listSection: {
    gap: spacing.sm,
  },
  paperCardItem: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  researchersList: {
    backgroundColor: colors.backgroundCard,
  },
});
