import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Search,
  ArrowLeft,
  X,
  Sparkles,
  Clock,
  Trash2,
  Users,
  FileText,
  Tag,
  MessageSquare,
  Compass,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { SearchBar } from '../../components/core/SearchBar';
import { TopicChip } from '../../components/core/TopicChip';
import { Typography } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { TopicCard } from '../../components/cards/TopicCard';
import { ResearcherCard } from '../../components/cards/ResearcherCard';
import { PostCard } from '../../components/cards/PostCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useSearchStore } from '../../store/useSearchStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchCategory } from '../../types';
import { POPULAR_DISCOVERIES } from '../../api/search/searchService';

interface FilterTabOption {
  key: SearchCategory;
  label: string;
  icon: any;
}

const FILTER_TABS: FilterTabOption[] = [
  { key: 'all', label: 'All', icon: Compass },
  { key: 'researchers', label: 'Researchers', icon: Users },
  { key: 'papers', label: 'Papers', icon: FileText },
  { key: 'topics', label: 'Topics', icon: Tag },
  { key: 'discussions', label: 'Discussions', icon: MessageSquare },
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: SearchCategory }>();

  const [inputQuery, setInputQuery] = useState(params.q || '');
  const debouncedQuery = useDebounce(inputQuery, 300);

  const query = useSearchStore((s) => s.query);
  const activeCategory = useSearchStore((s) => s.activeCategory);
  const results = useSearchStore((s) => s.results);
  const isLoading = useSearchStore((s) => s.isLoading);
  const isLoadingMore = useSearchStore((s) => s.isLoadingMore);
  const error = useSearchStore((s) => s.error);
  const hasMore = useSearchStore((s) => s.hasMore);
  const recentSearches = useSearchStore((s) => s.recentSearches);

  const setStoreQuery = useSearchStore((s) => s.setQuery);
  const setCategory = useSearchStore((s) => s.setCategory);
  const executeSearch = useSearchStore((s) => s.search);
  const loadMore = useSearchStore((s) => s.loadMore);
  const clearSearch = useSearchStore((s) => s.clearSearch);
  const removeRecentSearch = useSearchStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useSearchStore((s) => s.clearRecentSearches);

  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);

  // Initialize category from query params if passed
  useEffect(() => {
    if (params.category) {
      setCategory(params.category);
    }
  }, [params.category, setCategory]);

  // Sync debounced input with store search
  useEffect(() => {
    setStoreQuery(debouncedQuery);
    executeSearch(debouncedQuery, activeCategory);
  }, [debouncedQuery, activeCategory, setStoreQuery, executeSearch]);

  const handleSelectDiscovery = (suggestionQuery: string, suggestionCategory?: SearchCategory) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setInputQuery(suggestionQuery);
    if (suggestionCategory) {
      setCategory(suggestionCategory);
    }
    executeSearch(suggestionQuery, suggestionCategory || activeCategory);
  };

  const handleCategoryPress = (category: SearchCategory) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setCategory(category);
  };

  const handleClear = () => {
    setInputQuery('');
    clearSearch();
  };

  const totalResultsCount = results.totalCounts.all;
  const isQueryEmpty = !inputQuery.trim();

  const getCategoryBadgeCount = (cat: SearchCategory): number => {
    if (cat === 'all') return results.totalCounts.all;
    if (cat === 'researchers') return results.totalCounts.researchers;
    if (cat === 'papers') return results.totalCounts.papers;
    if (cat === 'topics') return results.totalCounts.topics;
    if (cat === 'discussions') return results.totalCounts.discussions;
    return 0;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header with Search Input */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchWrapper}>
          <SearchBar
            value={inputQuery}
            onChangeText={setInputQuery}
            placeholder="Search researchers, papers, topics, discussions..."
            autoFocus={!params.q}
            onClear={handleClear}
          />
        </View>
      </View>

      {/* Filter Category Chips with Count Badges */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeCategory === tab.key;
            const count = getCategoryBadgeCount(tab.key);
            const showCount = !isQueryEmpty && count > 0;

            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => handleCategoryPress(tab.key)}
                style={[
                  styles.filterPill,
                  isSelected ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected ? styles.filterPillTextActive : styles.filterPillTextInactive,
                  ]}
                >
                  {tab.label}
                </Text>
                {showCount && (
                  <View
                    style={[
                      styles.countBadge,
                      isSelected ? styles.countBadgeActive : styles.countBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        isSelected ? styles.countBadgeTextActive : styles.countBadgeTextInactive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Search failed"
            message={error}
            onRetry={() => executeSearch(inputQuery, activeCategory)}
            retryText="Try Again"
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
            <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              Searching BooffIn database...
            </Typography>
          </View>
        )}

        {/* Zero State / Discovery Hub when query is empty */}
        {isQueryEmpty && !isLoading && !error && (
          <View style={styles.discoveryContainer}>
            {/* Popular Scientific Discoveries */}
            <View style={styles.discoverySection}>
              <View style={styles.sectionHeaderRow}>
                <Sparkles size={16} color={colors.textPrimary} />
                <Typography variant="captionBold" color={colors.textPrimary} style={styles.sectionTitle}>
                  DISCOVER ON BOOFFIN
                </Typography>
              </View>

              <View style={styles.suggestionsGrid}>
                {POPULAR_DISCOVERIES.map((item) => (
                  <TouchableOpacity
                    key={item.query}
                    activeOpacity={0.78}
                    style={styles.suggestionCard}
                    onPress={() => handleSelectDiscovery(item.query, item.category)}
                  >
                    <View style={styles.suggestionBadge}>
                      <Typography variant="micro" color={colors.textSecondary} style={{ fontWeight: '700', textTransform: 'uppercase' }}>
                        {item.category}
                      </Typography>
                    </View>
                    <Typography variant="captionBold" color={colors.textPrimary} style={styles.suggestionLabel}>
                      "{item.label}"
                    </Typography>
                    <Typography variant="micro" color={colors.textMuted} numberOfLines={2} style={styles.suggestionDesc}>
                      {item.description}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.sectionHeaderRowBetween}>
                  <View style={styles.sectionHeaderRow}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Typography variant="captionBold" color={colors.textSecondary} style={styles.sectionTitle}>
                      RECENT SEARCHES
                    </Typography>
                  </View>
                  <TouchableOpacity onPress={clearRecentSearches} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Typography variant="micro" color={colors.textMuted}>
                      Clear all
                    </Typography>
                  </TouchableOpacity>
                </View>

                <View style={styles.recentList}>
                  {recentSearches.map((term) => (
                    <View key={term} style={styles.recentRow}>
                      <TouchableOpacity
                        style={styles.recentTextWrapper}
                        onPress={() => handleSelectDiscovery(term)}
                        activeOpacity={0.7}
                      >
                        <Search size={14} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                        <Typography variant="body" color={colors.textPrimary}>
                          {term}
                        </Typography>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeRecentSearch(term)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Results Sections */}
        {!isQueryEmpty && !isLoading && !error && (
          <View>
            {/* 1. Researchers Section */}
            {(activeCategory === 'all' || activeCategory === 'researchers') &&
              results.researchers.length > 0 && (
                <View style={styles.resultsBlock}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockTitleRow}>
                      <Users size={16} color={colors.textPrimary} />
                      <Typography variant="captionBold" color={colors.textPrimary} style={styles.blockTitleText}>
                        RESEARCHERS
                      </Typography>
                    </View>
                    <Typography variant="micro" color={colors.textSecondary}>
                      {results.totalCounts.researchers} found
                    </Typography>
                  </View>

                  {results.researchers.map((researcher) => (
                    <ResearcherCard
                      key={researcher.id}
                      researcher={researcher}
                      onFollowToggle={() => toggleFollowUser(researcher.id)}
                    />
                  ))}
                </View>
              )}

            {/* 2. Papers Section */}
            {(activeCategory === 'all' || activeCategory === 'papers') &&
              results.papers.length > 0 && (
                <View style={styles.resultsBlock}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockTitleRow}>
                      <FileText size={16} color={colors.textPrimary} />
                      <Typography variant="captionBold" color={colors.textPrimary} style={styles.blockTitleText}>
                        RESEARCH PAPERS
                      </Typography>
                    </View>
                    <Typography variant="micro" color={colors.textSecondary}>
                      {results.totalCounts.papers} found
                    </Typography>
                  </View>

                  {results.papers.map((paper) => (
                    <TrendingPaperCard key={paper.id} paper={paper} />
                  ))}
                </View>
              )}

            {/* 3. Topics Section */}
            {(activeCategory === 'all' || activeCategory === 'topics') &&
              results.topics.length > 0 && (
                <View style={styles.resultsBlock}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockTitleRow}>
                      <Tag size={16} color={colors.textPrimary} />
                      <Typography variant="captionBold" color={colors.textPrimary} style={styles.blockTitleText}>
                        TOPICS & DISCIPLINES
                      </Typography>
                    </View>
                    <Typography variant="micro" color={colors.textSecondary}>
                      {results.totalCounts.topics} found
                    </Typography>
                  </View>

                  {results.topics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
                  ))}
                </View>
              )}

            {/* 4. Discussions Section */}
            {(activeCategory === 'all' || activeCategory === 'discussions') &&
              results.discussions.length > 0 && (
                <View style={styles.resultsBlock}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockTitleRow}>
                      <MessageSquare size={16} color={colors.textPrimary} />
                      <Typography variant="captionBold" color={colors.textPrimary} style={styles.blockTitleText}>
                        SCIENTIFIC DISCUSSIONS
                      </Typography>
                    </View>
                    <Typography variant="micro" color={colors.textSecondary}>
                      {results.totalCounts.discussions} found
                    </Typography>
                  </View>

                  {results.discussions.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </View>
              )}

            {/* Load More Pagination */}
            {hasMore && (
              <View style={styles.loadMoreContainer}>
                <Button
                  title={isLoadingMore ? 'Loading more...' : 'Load More Results'}
                  variant="outline"
                  size="md"
                  onPress={loadMore}
                  disabled={isLoadingMore}
                  iconRight={
                    isLoadingMore ? (
                      <ActivityIndicator size="small" color={colors.textPrimary} style={{ marginLeft: spacing.xs }} />
                    ) : undefined
                  }
                  style={styles.loadMoreButton}
                />
              </View>
            )}

            {/* Empty State when zero results found */}
            {totalResultsCount === 0 && (
              <EmptyState
                icon="Search"
                title="No scientific results found"
                description={`No ${activeCategory === 'all' ? 'researchers, papers, topics, or discussions' : activeCategory} matched "${inputQuery.trim()}". Try different keywords or browse discovery suggestions below.`}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  searchWrapper: {
    flex: 1,
  },
  filterSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  filterPillInactive: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.borderLight,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.white,
  },
  filterPillTextInactive: {
    color: colors.textPrimary,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countBadgeInactive: {
    backgroundColor: colors.backgroundSecondary,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countBadgeTextActive: {
    color: colors.white,
  },
  countBadgeTextInactive: {
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryContainer: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  discoverySection: {
    gap: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionHeaderRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  suggestionBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionDesc: {
    lineHeight: 16,
  },
  recentSection: {
    gap: spacing.sm,
  },
  recentList: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recentTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultsBlock: {
    paddingTop: spacing.md,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  blockTitleText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  loadMoreContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadMoreButton: {
    width: '100%',
  },
});
