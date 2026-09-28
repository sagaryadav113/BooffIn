import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Activity,
  Eye,
  FileText,
  Share2,
  Users,
  Zap,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionIcon } from '../../components/core/DiscussionIcon';
import { LikeIcon } from '../../components/core/LikeIcon';
import { AnalyticsTimeframe, UserAnalyticsSummary } from '../../types/analytics';
import { fetchUserAnalytics } from '../../api/analyticsService';
import { AnalyticsChart } from '../../components/profile/AnalyticsChart';
import { useAuthStore } from '../../store';

const TIMEFRAMES: { key: AnalyticsTimeframe; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '14d', label: '14 Days' },
  { key: '28d', label: '28 Days' },
  { key: '60d', label: '60 Days' },
  { key: '90d', label: '90 Days' },
];

export default function ProfileAnalyticsScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const targetUserId = user?.id;

  const [selectedTimeframe, setSelectedTimeframe] = useState<AnalyticsTimeframe>('28d');
  const [summary, setSummary] = useState<UserAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadAnalytics = useCallback(async (timeframe: AnalyticsTimeframe) => {
    if (!targetUserId) return;
    setIsLoading(true);
    const res = await fetchUserAnalytics(targetUserId, timeframe);
    if (res.summary) {
      setSummary(res.summary);
    }
    setIsLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    if (targetUserId) {
      loadAnalytics(selectedTimeframe);
    }
  }, [targetUserId, selectedTimeframe, loadAnalytics]);

  const handleTimeframeChange = (tf: AnalyticsTimeframe) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedTimeframe(tf);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadAnalytics(selectedTimeframe);
    setIsRefreshing(false);
  };

  const formatNumber = (num?: number): string => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return `${num}`;
  };

  const activeTimeframeLabel = TIMEFRAMES.find((t) => t.key === selectedTimeframe)?.label || '28 Days';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.navTitleRow}>
          <Text style={styles.navTitle}>Profile Analytics</Text>
          <Text style={styles.navSubTitle}>
            {user?.fullName ? `${user.fullName} · Live Impact` : 'Audience & Engagement Insights'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Timeframe Filter Switcher */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {TIMEFRAMES.map((tf) => {
            const isSelected = selectedTimeframe === tf.key;
            return (
              <TouchableOpacity
                key={tf.key}
                style={[
                  styles.timeframePill,
                  isSelected && styles.timeframePillActive,
                ]}
                onPress={() => handleTimeframeChange(tf.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    isSelected && styles.timeframeTextActive,
                  ]}
                >
                  {tf.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {isLoading && !summary ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
          <Text style={styles.loadingText}>Fetching real performance metrics...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accentBlue}
            />
          }
        >
          {/* Header Real Data Banner */}
          <View style={styles.summaryBanner}>
            <View style={styles.bannerHeader}>
              <View style={styles.bannerBadge}>
                <Sparkles size={12} color={colors.accentBlue} />
                <Text style={styles.bannerBadgeText}>Real-Time Telemetry</Text>
              </View>
              <Text style={styles.bannerPeriodText}>Last {activeTimeframeLabel}</Text>
            </View>

            <View style={styles.bannerMetricRow}>
              <View>
                <Text style={styles.bannerMainLabel}>Total Reach & Impressions</Text>
                <Text style={styles.bannerMainValue}>
                  {formatNumber(summary?.totalViews)}
                </Text>
              </View>
              <View style={styles.bannerRateBadge}>
                <Zap size={14} color="#F59E0B" />
                <Text style={styles.bannerRateText}>
                  {summary?.engagementRate || 0}%
                </Text>
                <Text style={styles.bannerRateSub}>Eng. Rate</Text>
              </View>
            </View>
          </View>

          {/* 6 Core Metrics Grid */}
          <Text style={styles.sectionHeader}>PERFORMANCE METRICS</Text>
          <View style={styles.metricsGrid}>
            {/* 1. Views & Reach */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Eye size={16} color="#3B82F6" />
                </View>
                <Text style={styles.metricLabel}>Views & Reach</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.totalViews)}
              </Text>
              <Text style={styles.metricSub}>Post impressions</Text>
            </View>

            {/* 2. Posts Count */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <FileText size={16} color="#8B5CF6" />
                </View>
                <Text style={styles.metricLabel}>Posts Published</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.totalPosts)}
              </Text>
              <Text style={styles.metricSub}>Authored posts</Text>
            </View>

            {/* 3. Shares / Reposts */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                  <Share2 size={16} color="#EC4899" />
                </View>
                <Text style={styles.metricLabel}>Share Counts</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.totalShares)}
              </Text>
              <Text style={styles.metricSub}>Times content shared</Text>
            </View>

            {/* 4. Discussions */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <DiscussionIcon size={16} color={colors.accentGreen} />
                </View>
                <Text style={styles.metricLabel}>Discussions</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.totalDiscussions)}
              </Text>
              <Text style={styles.metricSub}>Comments & replies</Text>
            </View>

            {/* 5. Followers & Growth */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                  <Users size={16} color={colors.accentBlue} />
                </View>
                <Text style={styles.metricLabel}>Followers</Text>
              </View>
              <View style={styles.followerRow}>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.totalFollowers)}
                </Text>
                {(summary?.newFollowers || 0) > 0 && (
                  <View style={styles.newFollowerTag}>
                    <Text style={styles.newFollowerTagText}>
                      +{summary?.newFollowers} new
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.metricSub}>Total scientific audience</Text>
            </View>

            {/* 6. Engagement & Clicks */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Zap size={16} color="#F59E0B" />
                </View>
                <Text style={styles.metricLabel}>Engagement</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.postClicks)}
              </Text>
              <Text style={styles.metricSub}>Clicks, reads & interactions</Text>
            </View>
          </View>

          {/* Interactive Graphical Chart */}
          <Text style={styles.sectionHeader}>ACTIVITY & AUDIENCE TREND</Text>
          {summary?.dailySeries ? (
            <AnalyticsChart
              data={summary.dailySeries}
              timeframeLabel={activeTimeframeLabel}
            />
          ) : null}

          {/* Top Performing Posts */}
          {summary?.topPosts && summary.topPosts.length > 0 && (
            <View style={styles.topPostsSection}>
              <Text style={styles.sectionHeader}>TOP RESEARCH POSTS</Text>
              {summary.topPosts.map((post, idx) => (
                <View key={post.id || idx} style={styles.topPostCard}>
                  <View style={styles.topPostBadge}>
                    <Text style={styles.topPostRank}>#{idx + 1}</Text>
                  </View>
                  <View style={styles.topPostContent}>
                    <Text style={styles.topPostText} numberOfLines={2}>
                      {post.content}
                    </Text>
                    <View style={styles.topPostStatsRow}>
                      <View style={styles.topPostStatItem}>
                        <Eye size={12} color={colors.textSecondary} />
                        <Text style={styles.topPostStatText}>
                          {formatNumber(post.viewsCount)}
                        </Text>
                      </View>
                      <View style={styles.topPostStatItem}>
                        <LikeIcon size={12} isLiked={true} color={colors.textSecondary} />
                        <Text style={styles.topPostStatText}>
                          {formatNumber(post.likesCount)}
                        </Text>
                      </View>
                      <View style={styles.topPostStatItem}>
                        <DiscussionIcon size={12} color={colors.textSecondary} />
                        <Text style={styles.topPostStatText}>
                          {formatNumber(post.commentsCount)}
                        </Text>
                      </View>
                      <View style={styles.topPostStatItem}>
                        <Share2 size={12} color={colors.textSecondary} />
                        <Text style={styles.topPostStatText}>
                          {formatNumber(post.repostsCount)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: spacing.xl * 2 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleRow: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  navTitle: {
    ...typography.h4,
    fontSize: 16,
    color: colors.textPrimary,
  },
  navSubTitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBarContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  timeframePill: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timeframePillActive: {
    backgroundColor: colors.accentBlue,
    borderColor: colors.accentBlue,
  },
  timeframeText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeframeTextActive: {
    ...typography.captionBold,
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  summaryBanner: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  bannerBadgeText: {
    ...typography.microBold,
    fontSize: 10.5,
    color: colors.accentBlue,
  },
  bannerPeriodText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bannerMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerMainLabel: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  bannerMainValue: {
    ...typography.h1,
    fontSize: 26,
    color: colors.textPrimary,
    marginTop: 2,
  },
  bannerRateBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  bannerRateText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#D97706',
    fontWeight: '700',
  },
  bannerRateSub: {
    ...typography.micro,
    fontSize: 9.5,
    color: colors.textSecondary,
  },
  sectionHeader: {
    ...typography.captionBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md - 2,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
    flex: 1,
  },
  metricValue: {
    ...typography.h4,
    fontSize: 18,
    color: colors.textPrimary,
  },
  followerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  newFollowerTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  newFollowerTagText: {
    ...typography.microBold,
    fontSize: 10,
    color: colors.accentGreen,
  },
  metricSub: {
    ...typography.micro,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topPostsSection: {
    marginTop: spacing.xs,
  },
  topPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    gap: spacing.sm,
  },
  topPostBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPostRank: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  topPostContent: {
    flex: 1,
  },
  topPostText: {
    ...typography.captionMedium,
    fontSize: 12.5,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  topPostStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  topPostStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  topPostStatText: {
    ...typography.micro,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
});
