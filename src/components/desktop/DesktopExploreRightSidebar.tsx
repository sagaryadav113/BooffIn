import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import {
  Brain,
  Dna,
  FlaskConical,
  Cpu,
  Microscope,
  Pill,
  TrendingUp,
  Users,
  ArrowRight,
  Plus,
  Check,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useTopicStore } from '../../store/useTopicStore';
import { useAuthStore } from '../../store/useAuthStore';
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

interface DesktopExploreRightSidebarProps {
  onSelectField?: (field: string) => void;
}

export const DesktopExploreRightSidebar: React.FC<DesktopExploreRightSidebarProps> = ({
  onSelectField,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const topics = useTopicStore((s) => s.topics);
  const fetchTopics = useTopicStore((s) => s.fetchTopics);

  const [suggestedResearchers, setSuggestedResearchers] = useState<SuggestedResearcher[]>([]);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTopics(currentUser?.id);

    const loadSuggested = async () => {
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, handle, academic_title, institution, avatar_url')
          .limit(4);

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
      setFollowingStates((prev) => ({ ...prev, [researcherId]: currentFollowing }));
    }
  };

  const displayTopics = topics.slice(0, 6);

  return (
    <aside style={{ width: 320, minWidth: 320 }}>
      <View style={styles.container}>
        {/* 1. Real Research Topics / Fields */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Research Topics</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/topic')}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          {displayTopics.length > 0 ? (
            <View style={styles.fieldsGrid}>
              {displayTopics.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.8}
                  onPress={() =>
                    onSelectField ? onSelectField(t.name) : router.push(`/topic/${t.slug}`)
                  }
                  style={styles.fieldTile}
                >
                  <View style={styles.fieldIconWrap}>
                    <Brain size={17} color="#064E3B" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.fieldTileName} numberOfLines={2}>
                    {t.name}
                  </Text>
                  <Text style={styles.fieldTileCount}>
                    {t.postsCount > 0 ? `${t.postsCount} posts` : 'Active'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Loading scientific topics...</Text>
            </View>
          )}
        </View>

        {/* 2. Trending Topics */}
        {topics.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerLeft}>
                <TrendingUp size={16} color="#D97706" />
                <Text style={styles.cardTitle}>Trending Topics</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/topic')}
                style={styles.seeAllRow}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ArrowRight size={12} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.trendingList}>
              {topics.slice(0, 5).map((topic, idx) => (
                <TouchableOpacity
                  key={topic.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/topic/${topic.slug}`)}
                  style={styles.topicRow}
                >
                  <Text style={styles.topicRank}>{idx + 1}</Text>
                  <View style={styles.topicMeta}>
                    <Text style={styles.topicName} numberOfLines={1}>
                      {topic.name}
                    </Text>
                    <Text style={styles.topicCount}>
                      {topic.followersCount > 0 ? `${topic.followersCount} followers` : 'Trending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 3. Real Suggested Researchers from Database */}
        {suggestedResearchers.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Suggested Researchers</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/search?tab=researchers')}
                style={styles.seeAllRow}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ArrowRight size={12} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.researchersList}>
              {suggestedResearchers.map((res) => {
                const isFollowing = followingStates[res.id];
                return (
                  <View key={res.id} style={styles.scholarRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => router.push(`/profile/${res.id}`)}
                      style={styles.scholarTouch}
                    >
                      <Avatar uri={res.avatarUrl} name={res.fullName} size="sm" />
                      <View style={styles.scholarMeta}>
                        <Text style={styles.scholarName} numberOfLines={1}>
                          {res.fullName}
                        </Text>
                        <Text style={styles.scholarSub} numberOfLines={1}>
                          {[res.academicTitle, res.institution].filter(Boolean).join(' · ') || `@${res.handle}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleFollowToggle(res.id)}
                      style={[styles.followBtn, isFollowing && styles.followingBtn]}
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
        )}
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
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
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldTile: {
    width: '48%' as any,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  fieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3EE',
    marginBottom: 6,
  },
  fieldTileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  fieldTileCount: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  trendingList: {
    gap: 10,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topicRank: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    width: 14,
  },
  topicMeta: {
    flex: 1,
  },
  topicName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  topicCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  researchersList: {
    gap: 12,
  },
  scholarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scholarTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  scholarMeta: {
    flex: 1,
  },
  scholarName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  scholarSub: {
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
