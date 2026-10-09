import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
                <Sparkles size={12} color="#064E3B" />
                <Text style={styles.bannerBadgeText}>Live Scientific Telemetry</Text>
              </View>
              <Text style={styles.bannerPeriodText}>Last {activeTimeframeLabel}</Text>
            </View>

            <View style={styles.bannerMetricRow}>
              <View>
                <Text style={styles.bannerMainLabel}>Total Research Impressions</Text>
                <Text style={styles.bannerMainValue}>
                  {formatNumber(summary?.totalImpressions ?? summary?.totalViews)}
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

          {/* Core Metrics Grid */}
          <Text style={styles.sectionHeader}>PERFORMANCE & REACH</Text>
          <View style={styles.metricsGrid}>
            {/* 1. Total Impressions */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Eye size={16} color="#3B82F6" />
                </View>
                <Text style={styles.metricLabel}>Total Impressions</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.totalImpressions ?? summary?.totalViews)}
              </Text>
              <Text style={styles.metricSub}>Feed & search appearances</Text>
            </View>

            {/* 2. Unique Reach */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Users size={16} color={colors.accentGreen} />
                </View>
                <Text style={styles.metricLabel}>Unique Reach</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.uniqueReach)}
              </Text>
              <Text style={styles.metricSub}>Distinct scholars reached</Text>
            </View>

            {/* 3. Engaged Scholars */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Zap size={16} color="#F59E0B" />
                </View>
                <Text style={styles.metricLabel}>Engaged Scholars</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.engagedScholars || summary?.totalEngagement)}
              </Text>
              <Text style={styles.metricSub}>Active interactions & reads</Text>
            </View>

            {/* 4. Library Saves & Citations */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <FileText size={16} color="#8B5CF6" />
                </View>
                <Text style={styles.metricLabel}>Library Saves</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.totalSaves)}
              </Text>
              <Text style={styles.metricSub}>Saved for future citation</Text>
            </View>

            {/* 5. Discussions */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(6, 78, 59, 0.1)' }]}>
                  <DiscussionIcon size={16} color="#064E3B" />
                </View>
                <Text style={styles.metricLabel}>Discussions</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatNumber(summary?.totalDiscussions)}
              </Text>
              <Text style={styles.metricSub}>Peer reviews & comments</Text>
            </View>

            {/* 6. Followers & Growth */}
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                  <Users size={16} color="#EC4899" />
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
          </View>

          {/* Audience Discovery & Distribution (Instagram-Style) */}
          <Text style={styles.sectionHeader}>AUDIENCE DISCOVERY & REACH</Text>
          <View style={styles.discoveryCard}>
            <View style={styles.discoveryHeader}>
              <Text style={styles.discoveryTitle}>Discovery Breakdown</Text>
              <Text style={styles.discoverySub}>Followers vs. Non-Followers reached</Text>
            </View>

            {/* Segmented Progress Bar */}
            <View style={styles.splitBarContainer}>
              <View
                style={[
                  styles.splitBarFollowers,
                  { width: `${summary?.followerReachPercent ?? 0}%` },
                ]}
              />
              <View
                style={[
                  styles.splitBarNonFollowers,
                  { width: `${summary?.nonFollowerReachPercent ?? 0}%` },
                ]}
              />
            </View>

            <View style={styles.splitLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#064E3B' }]} />
                <Text style={styles.legendText}>
                  Followers: <Text style={{ fontWeight: '700' }}>{summary?.followerReachPercent ?? 0}%</Text>
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>
                  Discovery (Non-Followers): <Text style={{ fontWeight: '700' }}>{summary?.nonFollowerReachPercent ?? 0}%</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Top Disciplines & Institutions */}
          <View style={styles.demographicsRow}>
            {/* Top Disciplines */}
            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>Top Disciplines Reached</Text>
              <View style={styles.demoList}>
                {summary?.topDisciplines && summary.topDisciplines.length > 0 ? (
                  summary.topDisciplines.map((disc, idx) => (
                    <View key={idx} style={styles.demoItem}>
                      <View style={styles.demoItemHeader}>
                        <Text style={styles.demoItemName} numberOfLines={1}>
                          {disc.name}
                        </Text>
                        <Text style={styles.demoItemPercent}>{disc.percentage}%</Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, disc.percentage)}%`, backgroundColor: '#064E3B' },
                          ]}
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyDemoText}>
                    Audience discipline data will populate as researchers engage with your posts.
                  </Text>
                )}
              </View>
            </View>

            {/* Top Institutions */}
            <View style={styles.demoCard}>
              <Text style={styles.demoTitle}>Top Institutions</Text>
              <View style={styles.demoList}>
                {summary?.topInstitutions && summary.topInstitutions.length > 0 ? (
                  summary.topInstitutions.map((inst, idx) => (
                    <View key={idx} style={styles.demoItem}>
                      <View style={styles.demoItemHeader}>
                        <Text style={styles.demoItemName} numberOfLines={1}>
                          {inst.name}
                        </Text>
                        <Text style={styles.demoItemPercent}>{inst.percentage}%</Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, inst.percentage)}%`, backgroundColor: '#3B82F6' },
                          ]}
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyDemoText}>
                    Institution data will populate as verified scholars read and interact.
                  </Text>
                )}
              </View>
            </View>
          </View>


          {/* Interactive Graphical Chart */}
          <Text style={styles.sectionHeader}>IMPRESSIONS & ACTIVITY TIMELINE</Text>
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
                          {formatNumber(post.impressionsCount ?? post.viewsCount)} impressions
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
    backgroundColor: '#064E3B',
    borderColor: '#064E3B',
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
    backgroundColor: 'rgba(6, 78, 59, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  bannerBadgeText: {
    ...typography.microBold,
    fontSize: 10.5,
    color: '#064E3B',
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
  discoveryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  discoveryHeader: {
    marginBottom: spacing.sm,
  },
  discoveryTitle: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  discoverySub: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
  },
  splitBarContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    marginVertical: spacing.sm,
  },
  splitBarFollowers: {
    backgroundColor: '#064E3B',
    height: '100%',
  },
  splitBarNonFollowers: {
    backgroundColor: '#3B82F6',
    height: '100%',
  },
  splitLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  legendText: {
    ...typography.micro,
    fontSize: 11,
    color: colors.textSecondary,
  },
  demographicsRow: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  demoCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  demoTitle: {
    ...typography.captionBold,
    fontSize: 12.5,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  demoList: {
    gap: spacing.sm,
  },
  demoItem: {},
  demoItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  demoItemName: {
    ...typography.micro,
    fontSize: 11.5,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  demoItemPercent: {
    ...typography.microBold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
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
  emptyDemoText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.xs,
  },
});


