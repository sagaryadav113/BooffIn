import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Activity,
  Eye,
  FileText,
  Share2,
  Users,
  Zap,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { DiscussionIcon } from '../core/DiscussionIcon';
import { LikeIcon } from '../core/LikeIcon';
import { AnalyticsTimeframe, UserAnalyticsSummary } from '../../types/analytics';
import { fetchUserAnalytics } from '../../api/analyticsService';
import { AnalyticsChart } from './AnalyticsChart';

interface ProfileAnalyticsModalProps {
  visible: boolean;
  userId: string;
  userFullName?: string;
  onClose: () => void;
}

const TIMEFRAMES: { key: AnalyticsTimeframe; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '14d', label: '14 Days' },
  { key: '28d', label: '28 Days' },
  { key: '60d', label: '60 Days' },
  { key: '90d', label: '90 Days' },
];

export const ProfileAnalyticsModal: React.FC<ProfileAnalyticsModalProps> = ({
  visible,
  userId,
  userFullName,
  onClose,
}) => {
  const colors = useColors();
  const isDark = useIsDark();
  const [selectedTimeframe, setSelectedTimeframe] = useState<AnalyticsTimeframe>('28d');
  const [summary, setSummary] = useState<UserAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadAnalytics = useCallback(async (timeframe: AnalyticsTimeframe) => {
    if (!userId) return;
    setIsLoading(true);
    const res = await fetchUserAnalytics(userId, timeframe);
    if (res.summary) {
      setSummary(res.summary);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (visible && userId) {
      loadAnalytics(selectedTimeframe);
    }
  }, [visible, userId, selectedTimeframe, loadAnalytics]);

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        {/* Modal Top Navigation Bar */}
        <View style={[styles.navBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.borderLight }]}>
          <View style={styles.navTitleRow}>
            <View style={[styles.navIconBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(2, 132, 199, 0.1)' }]}>
              <Activity size={16} color={colors.accentBlue} />
            </View>
            <View>
              <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Research Analytics</Text>
              <Text style={[styles.navSubTitle, { color: colors.textSecondary }]}>
                {userFullName ? `${userFullName}'s Impact` : 'Audience & Engagement Insights'}
              </Text>
            </View>
          </View>

          <View style={styles.navActions}>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeframe Filter Switcher */}
        <View style={[styles.filterBarContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.borderLight }]}>
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
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight },
                    isSelected && {
                      backgroundColor: isDark ? '#10B981' : '#064E3B',
                      borderColor: isDark ? '#10B981' : '#064E3B',
                    },
                  ]}
                  onPress={() => handleTimeframeChange(tf.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeframeText,
                      { color: colors.textSecondary },
                      isSelected && { color: colors.white },
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching real performance metrics...</Text>
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
            <View style={[styles.summaryBanner, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
              <View style={styles.bannerHeader}>
                <View style={[styles.bannerBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 78, 59, 0.08)' }]}>
                  <Sparkles size={12} color={isDark ? '#34D399' : '#064E3B'} />
                  <Text style={[styles.bannerBadgeText, { color: isDark ? '#34D399' : '#064E3B' }]}>Live Scientific Telemetry</Text>
                </View>
                <Text style={[styles.bannerPeriodText, { color: colors.textSecondary }]}>Last {activeTimeframeLabel}</Text>
              </View>

              <View style={styles.bannerMetricRow}>
                <View style={styles.bannerMainMetric}>
                  <Text style={[styles.bannerMainLabel, { color: colors.textSecondary }]}>Total Research Impressions</Text>
                  <Text style={[styles.bannerMainValue, { color: colors.textPrimary }]}>
                    {formatNumber(summary?.totalImpressions ?? summary?.totalViews)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.bannerRateBadge,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
                    },
                  ]}
                >
                  <Zap size={14} color="#F59E0B" />
                  <Text style={[styles.bannerRateText, { color: isDark ? '#FBBF24' : '#D97706' }]}>
                    {summary?.engagementRate || 0}%
                  </Text>
                  <Text style={[styles.bannerRateSub, { color: colors.textSecondary }]}>Eng. Rate</Text>
                </View>
              </View>
            </View>

            {/* Core Metrics Grid */}
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PERFORMANCE & REACH</Text>
            <View style={styles.metricsGrid}>
              {/* 1. Total Impressions */}
              <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <Eye size={16} color="#3B82F6" />
                  </View>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Impressions</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatNumber(summary?.totalImpressions ?? summary?.totalViews)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Feed & search appearances</Text>
              </View>

              {/* 2. Unique Reach */}
              <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
                    <Users size={16} color={isDark ? '#34D399' : colors.accentGreen} />
                  </View>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Unique Reach</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatNumber(summary?.uniqueReach)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Distinct scholars reached</Text>
              </View>

              {/* 3. Engaged Scholars */}
              <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Zap size={16} color="#F59E0B" />
                  </View>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Engaged Scholars</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatNumber(summary?.engagedScholars || summary?.totalEngagement)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Active interactions & reads</Text>
              </View>

              {/* 4. Library Saves & Citations */}
              <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                    <FileText size={16} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Library Saves</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatNumber(summary?.totalSaves)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Saved for future citation</Text>
              </View>

              {/* 5. Discussions */}
              <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 78, 59, 0.1)' }]}>
                    <DiscussionIcon size={16} color={isDark ? '#34D399' : '#064E3B'} />
                  </View>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Discussions</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatNumber(summary?.totalDiscussions)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Peer reviews & comments</Text>
              </View>

              {/* 6. Followers & Growth */}
              <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
                    <Users size={16} color="#EC4899" />
                  </View>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Followers</Text>
                </View>
                <View style={styles.followerRow}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                    {formatNumber(summary?.totalFollowers)}
                  </Text>
                  {(summary?.newFollowers || 0) > 0 && (
                    <View style={[styles.newFollowerTag, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
                      <Text style={[styles.newFollowerTagText, { color: isDark ? '#34D399' : colors.accentGreen }]}>
                        +{summary?.newFollowers} new
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Total scientific audience</Text>
              </View>
            </View>

            {/* Audience Discovery & Distribution (Instagram-Style) */}
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>AUDIENCE DISCOVERY & REACH</Text>
            <View style={[styles.discoveryCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
              <View style={styles.discoveryHeader}>
                <Text style={[styles.discoveryTitle, { color: colors.textPrimary }]}>Discovery Breakdown</Text>
                <Text style={[styles.discoverySub, { color: colors.textSecondary }]}>Followers vs. Non-Followers reached</Text>
              </View>

              {/* Segmented Progress Bar */}
              <View style={[styles.splitBarContainer, { backgroundColor: isDark ? '#1F2636' : colors.backgroundSecondary }]}>
                <View
                  style={[
                    styles.splitBarFollowers,
                    {
                      width: `${summary?.followerReachPercent ?? 0}%`,
                      backgroundColor: isDark ? '#10B981' : '#064E3B',
                    },
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
                  <View style={[styles.legendDot, { backgroundColor: isDark ? '#10B981' : '#064E3B' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    Followers: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{summary?.followerReachPercent ?? 0}%</Text>
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    Discovery (Non-Followers): <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{summary?.nonFollowerReachPercent ?? 0}%</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Top Disciplines & Institutions */}
            <View style={styles.demographicsRow}>
              {/* Top Disciplines */}
              <View style={[styles.demoCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <Text style={[styles.demoTitle, { color: colors.textPrimary }]}>Top Disciplines Reached</Text>
                <View style={styles.demoList}>
                  {summary?.topDisciplines && summary.topDisciplines.length > 0 ? (
                    summary.topDisciplines.map((disc, idx) => (
                      <View key={idx} style={styles.demoItem}>
                        <View style={styles.demoItemHeader}>
                          <Text style={[styles.demoItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {disc.name}
                          </Text>
                          <Text style={[styles.demoItemPercent, { color: colors.textSecondary }]}>{disc.percentage}%</Text>
                        </View>
                        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#1F2636' : colors.backgroundSecondary }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${Math.min(100, disc.percentage)}%`, backgroundColor: isDark ? '#10B981' : '#064E3B' },
                            ]}
                          />
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyDemoText, { color: colors.textSecondary }]}>
                      Audience discipline data will populate as researchers engage with your posts.
                    </Text>
                  )}
                </View>
              </View>

              {/* Top Institutions */}
              <View style={[styles.demoCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                <Text style={[styles.demoTitle, { color: colors.textPrimary }]}>Top Institutions</Text>
                <View style={styles.demoList}>
                  {summary?.topInstitutions && summary.topInstitutions.length > 0 ? (
                    summary.topInstitutions.map((inst, idx) => (
                      <View key={idx} style={styles.demoItem}>
                        <View style={styles.demoItemHeader}>
                          <Text style={[styles.demoItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {inst.name}
                          </Text>
                          <Text style={[styles.demoItemPercent, { color: colors.textSecondary }]}>{inst.percentage}%</Text>
                        </View>
                        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#1F2636' : colors.backgroundSecondary }]}>
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
                    <Text style={[styles.emptyDemoText, { color: colors.textSecondary }]}>
                      Institution data will populate as verified scholars read and interact.
                    </Text>
                  )}
                </View>
              </View>
            </View>


            {/* Interactive Graphical Chart */}
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>IMPRESSIONS & ACTIVITY TIMELINE</Text>
            {summary?.dailySeries ? (
              <AnalyticsChart
                data={summary.dailySeries}
                timeframeLabel={activeTimeframeLabel}
              />
            ) : null}

            {/* Top Performing Posts in Timeframe */}
            {summary?.topPosts && summary.topPosts.length > 0 && (
              <View style={styles.topPostsSection}>
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>TOP RESEARCH POSTS</Text>
                {summary.topPosts.map((post, idx) => (
                  <View key={post.id || idx} style={[styles.topPostCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                    <View style={[styles.topPostBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <Text style={[styles.topPostRank, { color: colors.textSecondary }]}>#{idx + 1}</Text>
                    </View>
                    <View style={styles.topPostContent}>
                      <Text style={[styles.topPostText, { color: colors.textPrimary }]} numberOfLines={2}>
                        {post.content}
                      </Text>
                      <View style={styles.topPostStatsRow}>
                        <View style={styles.topPostStatItem}>
                          <Eye size={12} color={colors.textSecondary} />
                          <Text style={[styles.topPostStatText, { color: colors.textSecondary }]}>
                            {formatNumber(post.impressionsCount ?? post.viewsCount)} impressions
                          </Text>
                        </View>
                        <View style={styles.topPostStatItem}>
                          <LikeIcon size={12} isLiked={true} color={colors.textSecondary} />
                          <Text style={[styles.topPostStatText, { color: colors.textSecondary }]}>
                            {formatNumber(post.likesCount)}
                          </Text>
                        </View>
                        <View style={styles.topPostStatItem}>
                          <DiscussionIcon size={12} color={colors.textSecondary} />
                          <Text style={[styles.topPostStatText, { color: colors.textSecondary }]}>
                            {formatNumber(post.commentsCount)}
                          </Text>
                        </View>
                        <View style={styles.topPostStatItem}>
                          <Share2 size={12} color={colors.textSecondary} />
                          <Text style={[styles.topPostStatText, { color: colors.textSecondary }]}>
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
    </Modal>
  );
};

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
  navTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 34,
    height: 34,
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
  bannerMainMetric: {},
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


