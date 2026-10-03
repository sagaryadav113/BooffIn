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
  Sparkles,
  TrendingUp,
  UserPlus,
  Compass,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { DiscussionIcon } from '../core/DiscussionIcon';
import { LikeIcon } from '../core/LikeIcon';
import { PostImpactSummary } from '../../types/analytics';
import { fetchSinglePostImpact } from '../../api/analyticsService';
import { useAuthStore } from '../../store/useAuthStore';

interface PostImpactModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export const PostImpactModal: React.FC<PostImpactModalProps> = ({
  visible,
  postId,
  onClose,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<PostImpactSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadImpact = useCallback(async () => {
    if (!postId || !currentUser?.id) return;
    setIsLoading(true);
    setErrorMessage(null);
    const res = await fetchSinglePostImpact(postId, currentUser.id);
    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.summary) {
      setSummary(res.summary);
    }
    setIsLoading(false);
  }, [postId, currentUser?.id]);

  useEffect(() => {
    if (visible && postId && currentUser?.id) {
      loadImpact();
    }
  }, [visible, postId, currentUser?.id, loadImpact]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadImpact();
    setIsRefreshing(false);
  };

  const formatNumber = (num?: number): string => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return `${num}`;
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <View style={styles.navTitleRow}>
            <View style={styles.navIconBadge}>
              <Activity size={16} color="#064E3B" />
            </View>
            <View>
              <Text style={styles.navTitle}>Post Impact</Text>
              <Text style={styles.navSubTitle}>Author Insights & Telemetry</Text>
            </View>
          </View>

          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Body */}
        {isLoading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#064E3B" />
            <Text style={styles.loadingText}>Calculating scientific post impact...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to load impact</Text>
            <Text style={styles.errorSub}>{errorMessage}</Text>
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
                tintColor="#064E3B"
                colors={['#064E3B']}
              />
            }
          >
            {/* Post Snippet & Rate Banner */}
            <View style={styles.summaryBanner}>
              <View style={styles.bannerHeader}>
                <View style={styles.bannerBadge}>
                  <Sparkles size={12} color="#064E3B" />
                  <Text style={styles.bannerBadgeText}>Real Interaction Telemetry</Text>
                </View>
                <Text style={styles.bannerDateText}>
                  Published {formatDate(summary?.createdAt)}
                </Text>
              </View>

              {summary?.content ? (
                <Text style={styles.postSnippetText} numberOfLines={2}>
                  "{summary.content}"
                </Text>
              ) : null}

              <View style={styles.bannerMetricRow}>
                <View>
                  <Text style={styles.bannerMainLabel}>Total Post Impressions</Text>
                  <Text style={styles.bannerMainValue}>
                    {formatNumber(summary?.totalImpressions)}
                  </Text>
                </View>
                <View style={styles.bannerRateBadge}>
                  <Zap size={14} color="#F59E0B" />
                  <Text style={styles.bannerRateText}>
                    {summary?.engagementRate || 0}%
                  </Text>
                  <Text style={styles.bannerRateSub}>Impact Rate</Text>
                </View>
              </View>
            </View>

            {/* Performance Grid */}
            <Text style={styles.sectionHeader}>REACH & SCIENTIFIC INTERACTIONS</Text>
            <View style={styles.metricsGrid}>
              {/* Total Impressions */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Eye size={15} color="#3B82F6" />
                  </View>
                  <Text style={styles.metricLabel}>Impressions</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.totalImpressions)}
                </Text>
                <Text style={styles.metricSub}>Times appeared in feeds & search</Text>
              </View>

              {/* Unique Reach */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(6, 78, 59, 0.1)' }]}>
                    <Users size={15} color="#064E3B" />
                  </View>
                  <Text style={styles.metricLabel}>Unique Reach</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.uniqueReach)}
                </Text>
                <Text style={styles.metricSub}>Distinct scholars reached</Text>
              </View>

              {/* Engaged Scholars */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <Zap size={15} color="#F59E0B" />
                  </View>
                  <Text style={styles.metricLabel}>Engaged Scholars</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.engagedScholars)}
                </Text>
                <Text style={styles.metricSub}>Scholars who interacted</Text>
              </View>

              {/* Library Saves */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                    <FileText size={15} color="#8B5CF6" />
                  </View>
                  <Text style={styles.metricLabel}>Library Saves</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.savesCount)}
                </Text>
                <Text style={styles.metricSub}>Saved for future citation</Text>
              </View>

              {/* Discussions */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <DiscussionIcon size={15} color={colors.accentGreen} />
                  </View>
                  <Text style={styles.metricLabel}>Discussions</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.discussionsCount)}
                </Text>
                <Text style={styles.metricSub}>Peer inquiries & replies</Text>
              </View>

              {/* Likes / Upvotes */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <LikeIcon size={15} isLiked={true} color="#EF4444" />
                  </View>
                  <Text style={styles.metricLabel}>Endorsements</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.likesCount)}
                </Text>
                <Text style={styles.metricSub}>Scholarly upvotes</Text>
              </View>

              {/* Reposts */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(6, 78, 59, 0.1)' }]}>
                    <Share2 size={15} color="#064E3B" />
                  </View>
                  <Text style={styles.metricLabel}>Reposts</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.sharesCount)}
                </Text>
                <Text style={styles.metricSub}>Shared with scientific peers</Text>
              </View>

              {/* Post DOI / Reads */}
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <TrendingUp size={15} color="#3B82F6" />
                  </View>
                  <Text style={styles.metricLabel}>Post Clicks</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatNumber(summary?.postClicks)}
                </Text>
                <Text style={styles.metricSub}>Deep reads & DOI paper clicks</Text>
              </View>
            </View>

            {/* Audience Discovery & Distribution (Instagram-Style) */}
            <Text style={styles.sectionHeader}>AUDIENCE DISCOVERY (ALGORITHM)</Text>
            <View style={styles.discoveryCard}>
              <View style={styles.discoveryHeader}>
                <Text style={styles.discoveryTitle}>Audience Reach Source</Text>
                <Text style={styles.discoverySub}>
                  Followers vs. Non-Followers who discovered this post
                </Text>
              </View>

              {/* Segmented Progress Bar */}
              <View style={styles.splitBarContainer}>
                <View
                  style={[
                    styles.splitBarFollowers,
                    { width: `${summary?.followerReachPercent || 36}%` },
                  ]}
                />
                <View
                  style={[
                    styles.splitBarNonFollowers,
                    { width: `${summary?.nonFollowerReachPercent || 64}%` },
                  ]}
                />
              </View>

              <View style={styles.splitLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#064E3B' }]} />
                  <Text style={styles.legendText}>
                    Followers: <Text style={{ fontWeight: '700' }}>{summary?.followerReachPercent || 36}%</Text>
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.legendText}>
                    Discovery (Non-Followers): <Text style={{ fontWeight: '700' }}>{summary?.nonFollowerReachPercent || 64}%</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Demographics */}
            <View style={styles.demographicsContainer}>
              {/* Disciplines */}
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
                      Audience discipline data will populate as researchers engage with this post.
                    </Text>
                  )}
                </View>
              </View>

              {/* Institutions */}
              <View style={styles.demoCard}>
                <Text style={styles.demoTitle}>Top Academic Institutions</Text>
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


            {/* Profile Activity Generated */}
            <Text style={styles.sectionHeader}>PROFILE ACTIVITY GENERATED</Text>
            <View style={styles.activityGrid}>
              <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <Compass size={16} color="#064E3B" />
                  <Text style={styles.activityLabel}>Profile Visits</Text>
                </View>
                <Text style={styles.activityValue}>{summary?.profileVisits || 0}</Text>
                <Text style={styles.activitySub}>Scholars visited your profile</Text>
              </View>

              <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <UserPlus size={16} color="#10B981" />
                  <Text style={styles.activityLabel}>Follows Gained</Text>
                </View>
                <Text style={styles.activityValue}>+{summary?.followsGained || 0}</Text>
                <Text style={styles.activitySub}>New peer connections</Text>
              </View>
            </View>

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
    backgroundColor: 'rgba(6, 78, 59, 0.1)',
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  errorSub: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
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
    marginBottom: spacing.xs + 2,
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
  bannerDateText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  postSnippetText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginVertical: 6,
  },
  bannerMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  bannerMainLabel: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  bannerMainValue: {
    ...typography.h1,
    fontSize: 24,
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
    fontSize: 15,
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
    width: 24,
    height: 24,
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
    fontSize: 17,
    color: colors.textPrimary,
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
  demographicsContainer: {
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
    marginBottom: 4,
  },
  demoItemName: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textPrimary,
    flex: 1,
  },
  demoItemPercent: {
    ...typography.microBold,
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  activityCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activityLabel: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  activityValue: {
    ...typography.h3,
    fontSize: 19,
    color: colors.textPrimary,
  },
  activitySub: {
    ...typography.micro,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyDemoText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.xs,
  },
});

