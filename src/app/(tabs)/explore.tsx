import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Compass, Sparkles, ArrowRight, SlidersHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { SearchBar } from '../../components/core/SearchBar';
import { FilterPills } from '../../components/core/FilterPills';
import { TopicCategoryCard } from '../../components/cards/TopicCategoryCard';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { TrendingDiscussionCard } from '../../components/cards/TrendingDiscussionCard';
import { ResearcherCard } from '../../components/cards/ResearcherCard';
import { TopicCard } from '../../components/cards/TopicCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePaperStore } from '../../store/usePaperStore';
import { useTopicStore } from '../../store/useTopicStore';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../api/client';
import { UserProfile } from '../../types';

const QUICK_QUERIES = [
  'AlphaFold',
  'CRISPR-Cas9',
  'Brain Mapping',
  'Single-cell RNA',
  'Organoids',
  'Synaptic Plasticity',
  'Immunotherapy',
  'Quantum Optics',
];

const EXPLORE_FILTERS = [
  'All',
  'Research Papers',
  'Discussions',
  'Topic Fields',
  'Researchers',
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [researchersList, setResearchersList] = useState<UserProfile[]>([]);
  const [isLoadingResearchers, setIsLoadingResearchers] = useState(false);

  const papers = usePaperStore((s) => s.papers);
  const fetchPapers = usePaperStore((s) => s.fetchPapers);
  const topics = useTopicStore((s) => s.topics);
  const fetchTopics = useTopicStore((s) => s.fetchTopics);
  const posts = usePostStore((s) => s.posts);
  const fetchFeed = usePostStore((s) => s.fetchFeed);
  const currentUser = useAuthStore((s) => s.user);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);

  useEffect(() => {
    fetchPapers();
    fetchTopics(currentUser?.id);
    fetchFeed('For You', currentUser?.id);

    async function loadResearchers() {
      setIsLoadingResearchers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, academic_title, institution, bio, orcid_id, is_orcid_verified, followers_count, following_count')
          .order('followers_count', { ascending: false })
          .limit(10);

        if (data && !error) {
          const mapped: UserProfile[] = data.map((row: any) => ({
            id: row.id,
            handle: row.username || 'researcher',
            fullName: row.full_name || 'Researcher',
            avatarUrl: row.avatar_url,
            academicTitle: row.academic_title || 'Researcher',
            institution: row.institution || '',
            bio: row.bio || '',
            orcidVerified: Boolean(row.is_orcid_verified),
            orcidId: row.orcid_id,
            followersCount: row.followers_count || 0,
            followingCount: row.following_count || 0,
            postsCount: 0,
            savedCount: 0,
            joinedDate: '',
          }));
          setResearchersList(mapped);
        }
      } catch {}
      setIsLoadingResearchers(false);
    }
    loadResearchers();
  }, [currentUser?.id]);

  const handleSearchSubmit = (query?: string) => {
    const term = (query || searchQuery).trim();
    if (term) {
      router.push({
        pathname: '/search',
        params: { q: term },
      });
    }
  };

  const handleQuickQuery = (term: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSearchQuery(term);
    handleSearchSubmit(term);
  };

  const trendingPapers = useMemo(() => {
    return [...papers].sort(
      (a, b) => b.discussionCount + b.citationCount - (a.discussionCount + a.citationCount)
    );
  }, [papers]);

  const trendingDiscussions = useMemo(() => {
    return [...posts].filter((p) => p.commentsCount > 0);
  }, [posts]);

  const recommendedResearchers = useMemo(() => {
    return researchersList.filter((u) => u.id !== currentUser?.id);
  }, [researchersList, currentUser?.id]);

  const recommendedTopics = useMemo(() => {
    return topics.slice(0, 5);
  }, [topics]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        title="Explore"
        rightElement={
          <TouchableOpacity
            onPress={() => router.push('/topic')}
            style={styles.headerIconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SlidersHorizontal size={19} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearchSubmit()}
            placeholder="Search papers, DOI, researchers, fields..."
          />

          {/* Quick Discovery Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickQueriesScroll}
          >
            <View style={styles.promptLabelRow}>
              <Sparkles size={13} color={colors.textSecondary} />
              <Text style={styles.promptLabel}>Popular:</Text>
            </View>
            {QUICK_QUERIES.map((query) => (
              <TouchableOpacity
                key={query}
                activeOpacity={0.75}
                onPress={() => handleQuickQuery(query)}
                style={styles.queryChip}
              >
                <Text style={styles.queryChipText}>{query}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Discovery Filter Tabs */}
        <View style={styles.filterPillsWrapper}>
          <FilterPills
            options={EXPLORE_FILTERS}
            selected={activeFilter}
            onSelect={setActiveFilter}
          />
        </View>

        {/* SECTION 1: Research Topic Categories */}
        {(activeFilter === 'All' || activeFilter === 'Topic Fields') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Research Fields</Text>
                <Text style={styles.sectionSubtitle}>
                  Explore literature across {topics.length} scientific disciplines
                </Text>
              </View>
              {topics.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push('/topic')}
                  style={styles.seeAllRow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>All fields</Text>
                  <ArrowRight size={13} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {topics.length > 0 ? (
              <View style={styles.topicGrid}>
                {topics.map((topic) => (
                  <View key={topic.id} style={styles.topicGridItem}>
                    <TopicCategoryCard topic={topic} />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="Tag"
                title="No topics found"
                description="Follow or explore scientific fields to see them featured here."
              />
            )}
          </View>
        )}

        {/* SECTION 2: Trending Research (Papers) */}
        {(activeFilter === 'All' || activeFilter === 'Research Papers') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending Research</Text>
                <Text style={styles.sectionSubtitle}>
                  Peer-reviewed papers with high discussion velocity
                </Text>
              </View>
              {trendingPapers.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push('/search')}
                  style={styles.seeAllRow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                  <ArrowRight size={13} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {trendingPapers.length > 0 ? (
              <View style={styles.cardList}>
                {trendingPapers.map((paper) => (
                  <TrendingPaperCard key={paper.id} paper={paper} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="FileText"
                title="No papers have been published yet"
                description="Search for DOI references or be the first to reference a paper in discussion."
                actionTitle="Search Papers"
                onAction={() => router.push('/search')}
              />
            )}
          </View>
        )}

        {/* SECTION 3: Trending Discussions */}
        {(activeFilter === 'All' || activeFilter === 'Discussions') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending Discussions</Text>
                <Text style={styles.sectionSubtitle}>
                  Methodology questions and active debates in the community
                </Text>
              </View>
            </View>

            {trendingDiscussions.length > 0 ? (
              <View style={styles.cardList}>
                {trendingDiscussions.map((post) => (
                  <TrendingDiscussionCard key={post.id} post={post} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="MessageSquare"
                title="No discussions yet"
                description="Start a discussion or pose a research question on a paper."
                actionTitle="Create Discussion"
                onAction={() => router.push('/(tabs)/create')}
              />
            )}
          </View>
        )}

        {/* SECTION 4: Recommended Researchers */}
        {(activeFilter === 'All' || activeFilter === 'Researchers') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Researchers to Follow</Text>
                <Text style={styles.sectionSubtitle}>
                  Connect with active investigators in your scientific domains
                </Text>
              </View>
            </View>

            {recommendedResearchers.length > 0 ? (
              <View style={styles.researchersCard}>
                {recommendedResearchers.map((researcher) => (
                  <ResearcherCard
                    key={researcher.id}
                    researcher={researcher}
                    onFollowToggle={() => toggleFollowUser(researcher.id)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="Users"
                title="Be one of the first researchers to join BooffIn"
                description="Invite colleagues and peers to share literature and collaborate."
              />
            )}
          </View>
        )}

        {/* SECTION 5: Recommended Topics */}
        {(activeFilter === 'All' || activeFilter === 'Topic Fields') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recommended Topics</Text>
                <Text style={styles.sectionSubtitle}>
                  Stay updated with emerging preprints and publications
                </Text>
              </View>
            </View>

            {recommendedTopics.length > 0 ? (
              <View style={styles.topicsCard}>
                {recommendedTopics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="Tag"
                title="No topics found"
                description="Discover and follow scientific disciplines to customize your feed."
              />
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
  scrollContent: {
    paddingBottom: spacing.xxxl * 2,
  },
  headerIconButton: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  quickQueriesScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  promptLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  promptLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  queryChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  queryChipText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  filterPillsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs,
  },
  section: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md + 2,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13.5,
    marginTop: 2,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
    minHeight: layout.touchTargetMin - 12,
  },
  seeAllText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 13.5,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicGridItem: {
    width: '48.5%',
  },
  cardList: {
    gap: spacing.sm,
  },
  researchersCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
  },
  topicsCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
  },
});
