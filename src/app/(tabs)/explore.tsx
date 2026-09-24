import React, { useState, useMemo } from 'react';
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
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { SearchBar } from '../../components/core/SearchBar';
import { FilterPills } from '../../components/core/FilterPills';
import { TopicCategoryCard } from '../../components/cards/TopicCategoryCard';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { TrendingDiscussionCard } from '../../components/cards/TrendingDiscussionCard';
import { ResearcherCard } from '../../components/cards/ResearcherCard';
import { TopicCard } from '../../components/cards/TopicCard';
import { usePaperStore } from '../../store/usePaperStore';
import { useTopicStore } from '../../store/useTopicStore';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';

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

  const papers = usePaperStore((s) => s.papers);
  const topics = useTopicStore((s) => s.topics);
  const posts = usePostStore((s) => s.posts);
  const users = useAuthStore((s) => s.users);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);

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
    return users.filter((u) => u.id !== 'usr_me');
  }, [users]);

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
              <TouchableOpacity
                onPress={() => router.push('/topic')}
                style={styles.seeAllRow}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>All fields</Text>
                <ArrowRight size={13} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.topicGrid}>
              {topics.map((topic) => (
                <View key={topic.id} style={styles.topicGridItem}>
                  <TopicCategoryCard topic={topic} />
                </View>
              ))}
            </View>
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
              <TouchableOpacity
                onPress={() => router.push('/search')}
                style={styles.seeAllRow}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ArrowRight size={13} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.cardList}>
              {trendingPapers.map((paper) => (
                <TrendingPaperCard key={paper.id} paper={paper} />
              ))}
            </View>
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

            <View style={styles.cardList}>
              {trendingDiscussions.map((post) => (
                <TrendingDiscussionCard key={post.id} post={post} />
              ))}
            </View>
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

            <View style={styles.researchersCard}>
              {recommendedResearchers.map((researcher) => (
                <ResearcherCard
                  key={researcher.id}
                  researcher={researcher}
                  onFollowToggle={() => toggleFollowUser(researcher.id)}
                />
              ))}
            </View>
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

            <View style={styles.topicsCard}>
              {recommendedTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </View>
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
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
  },
  seeAllText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13,
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
