import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import {
  TrendingUp,
  Users,
  Activity,
  ArrowRight,
  Plus,
  Check,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useTopicStore } from '../../store/useTopicStore';
import { fetchUserAnalytics } from '../../api/analyticsService';
import { UserAnalyticsSummary } from '../../types/analytics';
import { supabase } from '../../api/client';
import { toggleFollowUserRpc } from '../../api/socialService';

interface SuggestedResearcher {
  id: string;
  fullName: string;
  handle: string;
  academicTitle?: string;
  institution?: string;
  avatarUrl?: string;
  isFollowing?: boolean;
}

export const DesktopRightSidebar: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const topics = useTopicStore((s) => s.topics);
  const fetchTopics = useTopicStore((s) => s.fetchTopics);

  const [analytics, setAnalytics] = useState<UserAnalyticsSummary | null>(null);
  const [suggestedResearchers, setSuggestedResearchers] = useState<SuggestedResearcher[]>([]);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTopics(currentUser?.id);

    if (currentUser?.id) {
      fetchUserAnalytics(currentUser.id, '28d').then(({ summary }) => {
        if (summary) setAnalytics(summary);
      });
    }

    // Fetch suggested researchers from Supabase
    const loadSuggested = async () => {
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, handle, academic_title, institution, avatar_url')
          .limit(5);

        if (currentUser?.id) {
          query = query.neq('id', currentUser.id);
        }

        const { data, error } = await query;
        if (data && !error) {
          setSuggestedResearchers(
            data.map((p) => ({
              id: p.id,
              fullName: p.full_name || p.handle || 'Researcher',
              handle: p.handle || 'scholar',
              academicTitle: p.academic_title,
              institution: p.institution,
              avatarUrl: p.avatar_url,
              isFollowing: false,
            }))
          );
        }
      } catch {}
    };

    loadSuggested();
  }, [currentUser?.id, fetchTopics]);

  const handleFollowToggle = async (researcherId: string) => {
    if (!currentUser?.id) {
      router.push('/(auth)/login');
      return;
    }

    const currentFollowing = Boolean(followingStates[researcherId]);
    setFollowingStates((prev) => ({ ...prev, [researcherId]: !currentFollowing }));

    try {
      await toggleFollowUserRpc(currentUser.id, researcherId);
    } catch {
      // Revert on error
      setFollowingStates((prev) => ({ ...prev, [researcherId]: currentFollowing }));
    }
  };

  const topTopics = topics.slice(0, 5);

  return (
    <aside style={{ width: 320, minWidth: 320 }}>
      <View style={styles.container}>
        {/* 1. Researcher Impact Card */}
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
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.viewAnalyticsBtn}
            >
              <Text style={styles.viewAnalyticsText}>View Analytics</Text>
              <ArrowRight size={12} color="#064E3B" />
            </TouchableOpacity>
          </View>

          <View style={styles.impactBody}>
            <Text style={styles.impactStatNumber}>
              {analytics?.totalViews ? `${analytics.totalViews}` : '1.2K'}
            </Text>
            <Text style={styles.impactStatLabel}>Views (last 28d)</Text>
          </View>

          {/* Mini Sparkline Visualization */}
          <View style={styles.sparklineContainer}>
            {[35, 42, 38, 55, 60, 48, 70, 65, 80, 75, 90, 85, 95, 100].map((val, idx) => (
              <View
                key={idx}
                style={[
                  styles.sparklineBar,
                  {
                    height: (val / 100) * 28,
                    backgroundColor: idx >= 10 ? '#064E3B' : '#CBD5E1',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 2. Trending Research Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <TrendingUp size={16} color="#DC2626" strokeWidth={2.4} />
              <Text style={styles.cardTitle}>Trending Research</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/topic')}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>View all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.trendingList}>
            {topTopics.length > 0 ? (
              topTopics.map((topic, idx) => (
                <TouchableOpacity
                  key={topic.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/topic/${topic.slug}`)}
                  style={styles.trendingItem}
                >
                  <Text style={styles.trendingRank}>{idx + 1}</Text>
                  <View style={styles.trendingMeta}>
                    <Text style={styles.trendingName} numberOfLines={1}>
                      {topic.name}
                    </Text>
                    <Text style={styles.trendingPostsCount}>
                      {topic.postsCount > 0 ? `${topic.postsCount} posts` : 'Trending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              [
                { name: 'Synaptic plasticity', count: '12.4K posts' },
                { name: 'CRISPR screening', count: '8.7K posts' },
                { name: 'Protein language models', count: '8.1K posts' },
                { name: 'Brain-computer interfaces', count: '6.9K posts' },
                { name: 'Spatial transcriptomics', count: '5.6K posts' },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={item.name}
                  activeOpacity={0.7}
                  onPress={() => router.push('/topic')}
                  style={styles.trendingItem}
                >
                  <Text style={styles.trendingRank}>{idx + 1}</Text>
                  <View style={styles.trendingMeta}>
                    <Text style={styles.trendingName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.trendingPostsCount}>{item.count}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* 3. Researchers to Follow */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Users size={16} color="#064E3B" strokeWidth={2.4} />
              <Text style={styles.cardTitle}>Researchers to Follow</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/search?tab=researchers')}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>View all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.researchersList}>
            {suggestedResearchers.map((researcher) => {
              const isFollowing = followingStates[researcher.id];
              return (
                <View key={researcher.id} style={styles.researcherRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/profile/${researcher.id}`)}
                    style={styles.researcherMetaTouch}
                  >
                    <Avatar
                      uri={researcher.avatarUrl}
                      name={researcher.fullName}
                      size="sm"
                    />
                    <View style={styles.researcherInfo}>
                      <Text style={styles.researcherName} numberOfLines={1}>
                        {researcher.fullName}
                      </Text>
                      <Text style={styles.researcherSub} numberOfLines={1}>
                        {[researcher.academicTitle, researcher.institution]
                          .filter(Boolean)
                          .join(' · ') || `@${researcher.handle}`}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleFollowToggle(researcher.id)}
                    style={[
                      styles.followBtn,
                      isFollowing && styles.followingBtn,
                    ]}
                  >
                    {isFollowing ? (
                      <Check size={14} color="#064E3B" strokeWidth={2.5} />
                    ) : (
                      <Plus size={14} color="#064E3B" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
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
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  viewAnalyticsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#064E3B',
  },
  impactBody: {
    marginBottom: 12,
  },
  impactStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
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
    paddingTop: 4,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  trendingList: {
    gap: 10,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trendingRank: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    width: 14,
  },
  trendingMeta: {
    flex: 1,
  },
  trendingName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  trendingPostsCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  researchersList: {
    gap: 12,
  },
  researcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  researcherMetaTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  researcherInfo: {
    flex: 1,
  },
  researcherName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  researcherSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  followBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: '#064E3B',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingBtn: {
    backgroundColor: '#EAF3EE',
    borderColor: '#064E3B',
  },
});
