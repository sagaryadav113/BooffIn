import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Compass, Sparkles, ArrowRight, Search, FileText, Users, Award, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { SearchBar } from '../../components/core/SearchBar';
import { PaperCard } from '../../components/cards/PaperCard';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { TrendingDiscussionCard } from '../../components/cards/TrendingDiscussionCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ExploreFilterTabs } from '../../components/explore/ExploreFilterTabs';
import { RecentSearchesList } from '../../components/explore/RecentSearchesList';
import { ResearcherResultCard } from '../../components/explore/ResearcherResultCard';
import { useExploreSearchStore } from '../../store/useExploreSearchStore';
import { usePaperStore } from '../../store/usePaperStore';
import { useTopicStore } from '../../store/useTopicStore';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../api/client';
import { UserProfile } from '../../types';

export default function ExploreScreen() {
  const {
    searchQuery,
    activeCategory,
    isSearching,
    results,
    recentSearches,
    hasMoreResearchers,
    isLoadingMoreResearchers,
    setSearchQuery,
    setActiveCategory,
    executeSearch,
    loadMoreResearchers,
    clearSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useExploreSearchStore();

  const papers = usePaperStore((s) => s.papers);
  const fetchPapers = usePaperStore((s) => s.fetchPapers);
  const topics = useTopicStore((s) => s.topics);
  const fetchTopics = useTopicStore((s) => s.fetchTopics);
  const posts = usePostStore((s) => s.posts);
  const fetchFeed = usePostStore((s) => s.fetchFeed);
  const currentUser = useAuthStore((s) => s.user);

  const [researchersList, setResearchersList] = React.useState<UserProfile[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      await Promise.all([
        fetchPapers(),
        fetchTopics(currentUser?.id),
        fetchFeed('For You', currentUser?.id),
      ]);

      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, academic_title, institution, bio, orcid_id, is_orcid_verified, followers_count, following_count')
        .order('followers_count', { ascending: false })
        .limit(10);

      if (data) {
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
  }, [currentUser?.id, fetchPapers, fetchTopics, fetchFeed]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadInitialData();
    setIsRefreshing(false);
  };

  const handleSearchSubmit = (term?: string) => {
    const q = term !== undefined ? term : searchQuery;
    if (q.trim()) {
      try {
        Haptics.selectionAsync();
      } catch {}
      executeSearch(q);
    }
  };

  const handleSelectRecentOrTopic = (term: string) => {
    setSearchQuery(term);
    executeSearch(term);
  };

  const trendingPapers = useMemo(() => {
    return [...papers].sort(
      (a, b) => b.discussionCount + b.citationCount - (a.discussionCount + a.citationCount)
    );
  }, [papers]);

  const trendingDiscussions = useMemo(() => {
    return [...posts].filter((p) => p.commentsCount > 0);
  }, [posts]);

  const hasQuery = Boolean(searchQuery.trim());
  const hasResults = Boolean(results && (results.papers.length > 0 || results.researchers.length > 0));

  const detectedBadgeText = useMemo(() => {
    if (!results?.detectedInputType || results.detectedInputType === 'keyword') return null;
    switch (results.detectedInputType) {
      case 'doi':
        return 'DOI Reference Detected';
      case 'arxiv':
        return 'arXiv Preprint Detected';
      case 'orcid':
        return '16-Digit ORCID ID Detected';
      case 'url':
        return 'Publisher Article URL Detected';
      case 'user':
        return 'Scholar Handle Detected';
      default:
        return null;
    }
  }, [results?.detectedInputType]);

  const showResearchersFirst = useMemo(() => {
    if (activeCategory === 'researchers') return true;
    if (activeCategory === 'papers') return false;
    if (!searchQuery.trim()) return false;
    const parts = searchQuery.trim().split(/\s+/);
    const looksLikeName =
      parts.length >= 2 &&
      parts.length <= 4 &&
      parts.every((p) => /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-\.]{2,}$/.test(p));
    return looksLikeName || results?.detectedInputType === 'user' || results?.detectedInputType === 'orcid';
  }, [activeCategory, searchQuery, results?.detectedInputType]);

  const renderPapersSection = () => {
    if (!results || results.papers.length === 0) return null;
    if (activeCategory !== 'all' && activeCategory !== 'papers') return null;

    return (
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            RESEARCH ARTICLES ({results.papers.length})
          </Text>
        </View>
        {results.papers.map((paper) => (
          <View key={paper.id} style={styles.paperCardWrap}>
            <PaperCard paper={paper} />
          </View>
        ))}
      </View>
    );
  };

  const renderResearchersSection = () => {
    if (!results || results.researchers.length === 0) return null;
    if (activeCategory !== 'all' && activeCategory !== 'researchers') return null;

    return (
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            SCHOLARS & RESEARCHERS ({results.researchers.length})
          </Text>
        </View>
        {results.researchers.map((researcher) => (
          <ResearcherResultCard key={researcher.id} researcher={researcher} />
        ))}

        {/* Load More Scholars button */}
        {hasMoreResearchers && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={loadMoreResearchers}
            disabled={isLoadingMoreResearchers}
            activeOpacity={0.8}
          >
            {isLoadingMoreResearchers ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <Users size={14} color={colors.textPrimary} />
                <Text style={styles.loadMoreBtnText}>Load more scholars</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        title="Explore"
      />

      {/* Universal Search Bar */}
      <View style={styles.searchBarContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
          placeholder="Search by DOI, arXiv, ORCID, author, title..."
          onSubmitEditing={() => handleSearchSubmit()}
          onClear={clearSearch}
        />
      </View>

      {/* Filter Tabs */}
      <ExploreFilterTabs
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        counts={
          results
            ? {
                papers: results.papers.length,
                researchers: results.researchers.length,
              }
            : undefined
        }
      />

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.black}
            colors={[colors.black]}
          />
        }
      >
        {/* State A: Active Search Loading */}
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.black} />
            <Text style={styles.loadingText}>Searching global academic literature & registries...</Text>
          </View>
        )}

        {/* State B: Active Search Results */}
        {!isSearching && hasQuery && results && (
          <View style={styles.resultsContainer}>
            {/* Detected Intent Badge */}
            {detectedBadgeText && (
              <View style={styles.detectedPill}>
                <Sparkles size={12} color={colors.accentLink} />
                <Text style={styles.detectedPillText}>{detectedBadgeText}</Text>
              </View>
            )}

            {/* Sections (ordered dynamically based on query intent) */}
            {showResearchersFirst ? (
              <>
                {renderResearchersSection()}
                {renderPapersSection()}
              </>
            ) : (
              <>
                {renderPapersSection()}
                {renderResearchersSection()}
              </>
            )}

            {/* Empty State when no results found */}
            {!hasResults && (
              <EmptyState
                icon="Search"
                title="No direct matches found"
                description={`Could not find publications or scholars matching "${searchQuery}". Try searching by exact DOI, arXiv ID, 16-digit ORCID, or topic keywords.`}
                actionTitle="Clear Search"
                onAction={clearSearch}
              />
            )}
          </View>
        )}

        {/* State C: Default Discovery Feed (When not searching) */}
        {!hasQuery && (
          <>
            {/* Recent Searches */}
            <RecentSearchesList
              searches={recentSearches}
              onSelectSearch={handleSelectRecentOrTopic}
              onRemoveSearch={removeRecentSearch}
              onClearAll={clearRecentSearches}
            />

            {/* Featured Trending Papers */}
            {trendingPapers.length > 0 && (
              <View style={styles.discoverySection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleLeft}>
                    <FileText size={16} color={colors.textPrimary} />
                    <Text style={styles.discoverySectionTitle}>FEATURED RESEARCH PAPERS</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveCategory('papers')}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>Explore all</Text>
                    <ArrowRight size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {trendingPapers.slice(0, 4).map((paper) => (
                  <View key={paper.id} style={styles.paperCardWrap}>
                    <PaperCard paper={paper} />
                  </View>
                ))}
              </View>
            )}

            {/* Recommended Scholars */}
            {researchersList.length > 0 && (
              <View style={styles.discoverySection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Users size={16} color={colors.textPrimary} />
                    <Text style={styles.discoverySectionTitle}>ACTIVE SCHOLARS & PEERS</Text>
                  </View>
                </View>

                {researchersList.slice(0, 5).map((researcher) => (
                  <ResearcherResultCard
                    key={researcher.id}
                    researcher={{
                      id: researcher.id,
                      fullName: researcher.fullName,
                      handle: researcher.handle,
                      avatarUrl: researcher.avatarUrl,
                      academicTitle: researcher.academicTitle,
                      institution: researcher.institution,
                      bio: researcher.bio,
                      orcidId: researcher.orcidId,
                      orcidVerified: researcher.orcidVerified,
                      followersCount: researcher.followersCount,
                      followingCount: researcher.followingCount,
                      isRegisteredUser: true,
                    }}
                  />
                ))}
              </View>
            )}
          </>
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
  searchBarContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 20,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13.5,
  },
  resultsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  detectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: spacing.md,
  },
  detectedPillText: {
    ...typography.microBold,
    color: '#1D4ED8',
    fontSize: 11.5,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeaderTitle: {
    ...typography.microBold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  paperCardWrap: {
    marginBottom: spacing.md,
  },
  discoverySection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  discoverySectionTitle: {
    ...typography.microBold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  loadMoreBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
});
