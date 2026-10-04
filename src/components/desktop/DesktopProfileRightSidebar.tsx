import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import {
  Activity,
  ArrowRight,
  Edit2,
  Globe,
  ExternalLink,
  BookOpen,
  Repeat2,
  Bookmark,
  UserPlus,
  MessageSquare,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { UserProfile } from '../../types';
import { fetchUserAnalytics } from '../../api/analyticsService';
import { UserAnalyticsSummary } from '../../types/analytics';
import { fetchUserComments, UserCommentActivity } from '../../api/socialService';

interface DesktopProfileRightSidebarProps {
  user: UserProfile | null;
  onOpenAnalytics?: () => void;
  onEditProfile?: () => void;
}

export const DesktopProfileRightSidebar: React.FC<DesktopProfileRightSidebarProps> = ({
  user,
  onOpenAnalytics,
  onEditProfile,
}) => {
  const fields = [user?.primaryField, ...(user?.secondaryFields || [])].filter(Boolean);
  const interests = user?.researchInterests || [];

  const [analytics, setAnalytics] = useState<UserAnalyticsSummary | null>(null);
  const [activities, setActivities] = useState<UserCommentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      Promise.all([
        fetchUserAnalytics(user.id, '28d').then(({ summary }) => {
          if (summary) setAnalytics(summary);
        }),
        fetchUserComments(user.id).then(({ comments }) => {
          setActivities(comments.slice(0, 4));
        }),
      ]).finally(() => setIsLoading(false));
    }
  }, [user?.id]);

  const handleOpenLink = (url?: string) => {
    if (!url) return;
    const clean = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(clean).catch(() => {});
  };

  const sparklineData = analytics?.dailySeries && analytics.dailySeries.length > 0
    ? analytics.dailySeries.slice(-14)
    : [];

  const maxViews = Math.max(...sparklineData.map((d) => d.views || 0), 1);

  return (
    <aside
      style={{
        width: 320,
        minWidth: 320,
        position: 'sticky',
        top: 68,
        height: 'calc(100vh - 68px)',
        alignSelf: 'flex-start',
        overflowY: 'auto',
      }}
    >
      <View style={styles.container}>
        {/* 1. Real Research Impact Card */}
        <View style={styles.card}>
          <View style={styles.impactHeader}>
            <View style={styles.impactTitleRow}>
              <View style={styles.impactIconBadge}>
                <Activity size={16} color="#064E3B" strokeWidth={2.4} />
              </View>
              <Text style={styles.cardTitle}>Research Impact</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (onOpenAnalytics) {
                  onOpenAnalytics();
                } else {
                  router.push('/profile/analytics');
                }
              }}
              style={styles.viewAnalyticsBtn}
            >
              <Text style={styles.viewAnalyticsText}>View Analytics</Text>
              <ArrowRight size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.impactBody}>
            <Text style={styles.impactStatNumber}>
              {analytics?.totalViews ? `${analytics.totalViews}` : '0'}
            </Text>
            <Text style={styles.impactStatLabel}>Views (last 28d)</Text>
          </View>

          {sparklineData.length > 0 ? (
            <View style={styles.sparklineContainer}>
              {sparklineData.map((dp, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.sparklineBar,
                    {
                      height: Math.max(((dp.views || 0) / maxViews) * 28, 4),
                      backgroundColor: idx >= sparklineData.length - 4 ? '#064E3B' : '#CBD5E1',
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptySparkline}>
              <Text style={styles.emptySparklineText}>Analytics syncing</Text>
            </View>
          )}
        </View>

        {/* 2. Real About Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>About</Text>
            {onEditProfile && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onEditProfile}
                style={styles.editAction}
              >
                <Edit2 size={12} color="#64748B" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.aboutList}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Research Fields</Text>
              <Text style={styles.aboutValue}>
                {fields.length > 0 ? fields.join(' · ') : 'Not specified'}
              </Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Institution</Text>
              <Text style={styles.aboutValue}>
                {user?.institution || 'Academic Institution'}
              </Text>
            </View>

            {user?.websiteUrl ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenLink(user.websiteUrl)}
                style={styles.aboutRowClickable}
              >
                <Text style={styles.aboutLabel}>Website</Text>
                <View style={styles.linkValueRow}>
                  <Text style={styles.aboutLinkText} numberOfLines={1}>
                    {user.websiteUrl.replace(/^https?:\/\//, '')}
                  </Text>
                  <ExternalLink size={11} color="#2563EB" />
                </View>
              </TouchableOpacity>
            ) : null}

            {user?.orcidId ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenLink(`https://orcid.org/${user.orcidId}`)}
                style={styles.aboutRowClickable}
              >
                <Text style={styles.aboutLabel}>ORCID</Text>
                <View style={styles.linkValueRow}>
                  <Text style={styles.aboutLinkText}>{user.orcidId}</Text>
                  <ExternalLink size={11} color="#2563EB" />
                </View>
              </TouchableOpacity>
            ) : null}

            {user?.googleScholarUrl ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenLink(user.googleScholarUrl)}
                style={styles.aboutRowClickable}
              >
                <Text style={styles.aboutLabel}>Google Scholar</Text>
                <View style={styles.linkValueRow}>
                  <Text style={styles.aboutLinkText}>Connected</Text>
                  <ExternalLink size={11} color="#2563EB" />
                </View>
              </TouchableOpacity>
            ) : null}

            {user?.researchgateUrl ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenLink(user.researchgateUrl)}
                style={styles.aboutRowClickable}
              >
                <Text style={styles.aboutLabel}>ResearchGate</Text>
                <View style={styles.linkValueRow}>
                  <Text style={styles.aboutLinkText}>Connected</Text>
                  <ExternalLink size={11} color="#2563EB" />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 3. Real Research Interests */}
        {interests.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Research Interests</Text>
              {onEditProfile && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onEditProfile}
                  style={styles.editAction}
                >
                  <Edit2 size={12} color="#64748B" />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.chipsWrap}>
              {interests.map((interest, idx) => (
                <View key={idx} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 4. Real Recent Activity */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('booffin:set-profile-tab', { detail: 'Activity' }));
                }
                router.push('/(tabs)/profile?tab=Activity');
              }}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>View all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          {activities.length > 0 ? (
            <View style={styles.activityList}>
              {activities.map((act) => (
                <TouchableOpacity
                  key={act.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/post/${act.postId}`)}
                  style={styles.activityItem}
                >
                  <MessageSquare size={14} color="#064E3B" />
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {act.content}
                    </Text>
                    <Text style={styles.activityTime}>{act.createdAt}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>No recent public comments or discussions.</Text>
            </View>
          )}
        </View>
      </View>
    </aside>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  impactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#EAF3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAnalyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: radii.full,
  },
  viewAnalyticsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  impactBody: {
    marginBottom: 12,
  },
  impactStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  impactStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 32,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  emptySparkline: {
    paddingVertical: 6,
  },
  emptySparklineText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  aboutList: {
    gap: 10,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  aboutRowClickable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  aboutLabel: {
    fontSize: 12.5,
    color: '#64748B',
    width: 100,
  },
  aboutValue: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  linkValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  aboutLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2563EB',
    textAlign: 'right',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityMeta: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#1E293B',
  },
  activityTime: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  emptyActivity: {
    paddingVertical: 8,
  },
  emptyActivityText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
