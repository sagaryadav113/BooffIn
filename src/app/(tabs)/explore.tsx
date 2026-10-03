import React, { useEffect, useCallback, useMemo, useState } from 'react';
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
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Plus,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { SearchBar } from '../../components/core/SearchBar';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ExploreFilterTabs } from '../../components/explore/ExploreFilterTabs';
import { RecentSearchesList } from '../../components/explore/RecentSearchesList';
import { ResearcherResultCard } from '../../components/explore/ResearcherResultCard';
import { PaperCard } from '../../components/cards/PaperCard';
import { HypedPaperCard } from '../../components/cards/HypedPaperCard';
import { TopResearcherCard } from '../../components/cards/TopResearcherCard';
import { AddInterestsModal } from '../../components/modals/AddInterestsModal';
import { useExploreSearchStore } from '../../store/useExploreSearchStore';
import { usePaperStore } from '../../store/usePaperStore';
import { useTopicStore } from '../../store/useTopicStore';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { getHypedDomainData, HypedDomainData } from '../../api/hypedFeedService';
import { subscribeToPaperRead } from '../../api/hypeScoreService';
import { Paper, UserProfile } from '../../types';

export default function ExploreScreen() {
  const { isDesktop } = useResponsiveLayout();
  const {
    searchQuery,
    activeCategory,
    isSearching,
    results,
    recentSearches,
    hasMoreResearchers,
    isLoadingMoreResearchers,
    hasMorePapers,
    isLoadingMorePapers,
    setSearchQuery,
    setActiveCategory,
    executeSearch,
    loadMoreResearchers,
    loadMorePapers,
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

  // Dynamic user interests for top tab navigation
  const userInterests = useMemo(() => {
    const list = [
      ...(currentUser?.researchInterests || []),
      ...(currentUser?.secondaryFields || []),
    ];
    if (currentUser?.primaryField && !list.includes(currentUser.primaryField)) {
      list.unshift(currentUser.primaryField);
    }
    if (list.length === 0) {
      return ['Neuroscience', 'AI in Science', 'Biotech'];
    }
    return Array.from(new Set(list));
  }, [currentUser]);

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<string>('Neuroscience');

  // Timeframe filter state (Default to last 48 hours)
  const [timeframe, setTimeframe] = useState<'48h' | 'week' | 'all'>('48h');

  // Add Interests modal state
  const [isAddInterestsVisible, setIsAddInterestsVisible] = useState(false);

  // Hyped feed data state
  const [hypedData, setHypedData] = useState<HypedDomainData | null>(null);
  const [isLoadingHyped, setIsLoadingHyped] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize initial activeTab with user interests
  useEffect(() => {
    if (userInterests.length > 0 && activeTab !== 'For You' && activeTab !== 'Following') {
      if (!userInterests.includes(activeTab)) {
        setActiveTab(userInterests[0]);
      }
    }
  }, [userInterests, activeTab]);

  // Load domain-specific or personalized hyped feed
  const loadHypedFeed = useCallback(async (domain: string, tf: '48h' | 'week' | 'all') => {
    if (domain === 'Following') return;

    setIsLoadingHyped(true);
    try {
      const data = await getHypedDomainData(domain, tf, userInterests);
      setHypedData(data);
    } catch (e) {
      console.warn('[ExploreScreen] Error loading hyped domain data:', e);
    } finally {
      setIsLoadingHyped(false);
    }
  }, [userInterests]);

  useEffect(() => {
    if (activeTab !== 'Following') {
      loadHypedFeed(activeTab, timeframe);
    }
  }, [activeTab, timeframe, loadHypedFeed]);

  // Dynamically update explore hyped feed when a paper is read
  useEffect(() => {
    const unsubscribe = subscribeToPaperRead(() => {
      if (activeTab !== 'Following') {
        loadHypedFeed(activeTab, timeframe);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [activeTab, timeframe, loadHypedFeed]);

  const loadInitialData = useCallback(async () => {
    try {
      await Promise.all([
        fetchPapers(),
        fetchTopics(currentUser?.id),
        fetchFeed('For You', currentUser?.id),
        activeTab !== 'Following'
          ? loadHypedFeed(activeTab, timeframe)
          : Promise.resolve(),
      ]);
    } catch {}
  }, [currentUser?.id, fetchPapers, fetchTopics, fetchFeed, activeTab, timeframe, loadHypedFeed]);

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

  const handleTabSelect = (tab: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveTab(tab);
  };

  const handleTimeframeSelect = (tf: '48h' | 'week' | 'all') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setTimeframe(tf);
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

  // Automatically trigger debounced unified search when searchQuery changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, executeSearch]);

  const hasQuery = Boolean(searchQuery.trim());
  const hasResults = Boolean(
    results && (results.papers.length > 0 || results.researchers.length > 0)
  );

  const detectedBadgeText = useMemo(() => {
    if (!results?.detectedInputType) return null;
    switch (results.detectedInputType) {
      case 'doi':
        return 'DOI detected — Resolved canonical publication';
      case 'arxiv':
        return 'arXiv ID detected — Pre-print matched';
      case 'orcid':
        return 'ORCID detected — Matched verified researcher';
      case 'user':
        return 'Scholar query — Surfacing author publications & profile';
      default:
        return null;
    }
  }, [results?.detectedInputType]);

  const showResearchersFirst = useMemo(() => {
    if (!results) return false;
    return (
      results.detectedInputType === 'orcid' ||
      results.detectedInputType === 'user' ||
      (results.researchers.length > 0 && results.papers.length === 0)
    );
  }, [results]);

  // -------------------------------------------------------------
  // Render: Search Results Section for Papers
  // -------------------------------------------------------------
  const renderPapersSection = () => {
    if (!results || results.papers.length === 0) return null;
    return (
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            PAPERS ({results.papers.length})
          </Text>
        </View>
        {results.papers.map((paper) => (
          <View key={paper.id} style={styles.paperCardWrap}>
            <PaperCard paper={paper} />
          </View>
        ))}

        {hasMorePapers && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={loadMorePapers}
            disabled={isLoadingMorePapers}
            activeOpacity={0.8}
          >
            {isLoadingMorePapers ? (
              <ActivityIndicator size="small" color="#1B4D3E" />
            ) : (
              <Text style={styles.loadMoreText}>Load More Papers</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // -------------------------------------------------------------
  // Render: Search Results Section for Researchers
  // -------------------------------------------------------------
  const renderResearchersSection = () => {
    if (!results || results.researchers.length === 0) return null;
    return (
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            RESEARCHERS ({results.researchers.length})
          </Text>
        </View>
        {results.researchers.map((researcher) => (
          <ResearcherResultCard
            key={researcher.id}
            researcher={researcher}
            style={styles.researcherCardWrap}
          />
        ))}

        {hasMoreResearchers && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={loadMoreResearchers}
            disabled={isLoadingMoreResearchers}
            activeOpacity={0.8}
          >
            {isLoadingMoreResearchers ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <Text style={styles.loadMoreText}>Load More Researchers</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // -------------------------------------------------------------
  // Render: Domain Hyped Papers & Researchers (Exact Screenshot Match)
  // -------------------------------------------------------------
  const renderHypedDomainContent = () => {
    const displayPapers = hypedData?.papers || [];
    const displayResearchers = hypedData?.researchers || [];

    return (
      <View style={styles.hypedContainer}>
        {/* Section 1: Most Hyped Papers */}
        <View style={styles.hypedSectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <TrendingUp size={22} color="#1B4D3E" strokeWidth={2.5} />
              <Text style={styles.hypedMainTitle}>Most Hyped Papers</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleSearchSubmit(activeTab)}
              style={styles.seeAllAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAllActionText}>See all</Text>
              <ArrowRight size={14} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hypedSubtitle}>
            Top papers in {activeTab === 'For You' ? 'your personalized feed' : activeTab} {timeframe === '48h' ? 'in the last 48 hours' : timeframe === 'week' ? 'this week' : 'of all time'}, ranked by HYPE
          </Text>

          {/* Timeframe Filter Selector */}
          <View style={styles.timeframeRow}>
            <View style={styles.timeframePills}>
              {(['48h', 'week', 'all'] as const).map((tf) => {
                const isSelected = timeframe === tf;
                const label =
                  tf === '48h' ? 'Last 48 Hrs' : tf === 'week' ? 'This Week' : 'All Time';
                return (
                  <TouchableOpacity
                    key={tf}
                    activeOpacity={0.8}
                    onPress={() => handleTimeframeSelect(tf)}
                    style={[
                      styles.timeframePill,
                      isSelected && styles.timeframePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeframePillText,
                        isSelected && styles.timeframePillTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.filterButton}
              onPress={() => setIsAddInterestsVisible(true)}
            >
              <SlidersHorizontal size={13} color="#334155" />
              <Text style={styles.filterButtonText}>Filter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Papers List */}
        {isLoadingHyped && displayPapers.length === 0 ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color="#1B4D3E" />
            <Text style={styles.inlineLoadingText}>Ranking {activeTab} papers by HYPE...</Text>
          </View>
        ) : (
          <View style={styles.papersListContainer}>
            {displayPapers.slice(0, 5).map((paper, index) => (
              <HypedPaperCard
                key={paper.id}
                paper={paper}
                rank={index + 1}
                timeframe={timeframe}
              />
            ))}
          </View>
        )}

        {/* Section 2: Top Researchers */}
        <View style={styles.researchersSectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Users size={22} color="#1B4D3E" strokeWidth={2.4} />
              <Text style={styles.hypedMainTitle}>Top Researchers</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleSearchSubmit(`${activeTab} researcher`)}
              style={styles.seeAllAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAllActionText}>See all</Text>
              <ArrowRight size={14} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hypedSubtitle}>
            Most hyped researchers in {activeTab} this week
          </Text>

          {/* Horizontal Researcher Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.researcherCarouselContent}
            style={styles.researcherCarousel}
          >
            {displayResearchers.map((researcher, idx) => (
              <TopResearcherCard
                key={researcher.id}
                researcher={researcher}
                rank={idx + 1}
                hypeScore={researcher.hypeScore}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Mobile Main App Header */}
      {!isDesktop && <AppHeader title="Explore" />}

      {/* Desktop Page Title Banner */}
      {isDesktop && (
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>
            Explore
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
            Discover research, people and ideas from across science.
          </Text>
        </View>
      )}

      {/* Universal Search Bar (Mobile & Desktop) */}
      <View style={[styles.searchBarContainer, isDesktop && styles.desktopSearchBarContainer]}>
        <SearchBar
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
          placeholder="Search by DOI, arXiv, ORCID, author, title, topic..."
          onSubmitEditing={() => handleSearchSubmit()}
          onClear={clearSearch}
        />
      </View>

      {/* When searching, show category tabs (All, Papers, Researchers) */}
      {hasQuery && (
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
      )}

      {/* When not searching, show Dynamic Domain Navigation Tabs (Exact Screenshot Match) */}
      {!hasQuery && (
        <View style={styles.topTabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topTabsContent}
          >
            {/* Standard Feeds */}
            {['For You', 'Following'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.8}
                  onPress={() => handleTabSelect(tab)}
                  style={[styles.topTabItem, isActive && styles.topTabItemActive]}
                >
                  <Text
                    style={[
                      styles.topTabText,
                      isActive && styles.topTabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  {isActive && <View style={styles.topTabIndicator} />}
                </TouchableOpacity>
              );
            })}

            {/* Dynamic User Interests Tabs */}
            {userInterests.map((interest) => {
              const isActive = activeTab === interest;
              return (
                <TouchableOpacity
                  key={interest}
                  activeOpacity={0.8}
                  onPress={() => handleTabSelect(interest)}
                  style={[styles.topTabItem, isActive && styles.topTabItemActive]}
                >
                  <Text
                    style={[
                      styles.topTabText,
                      isActive && styles.topTabTextActive,
                    ]}
                  >
                    {interest}
                  </Text>
                  {isActive && <View style={styles.topTabIndicator} />}
                </TouchableOpacity>
              );
            })}

            {/* Add Interests Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsAddInterestsVisible(true)}
              style={styles.addInterestsTabBtn}
            >
              <Plus size={14} color="#1B4D3E" strokeWidth={2.5} />
              <Text style={styles.addInterestsTabText}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Main Scrollable Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#1B4D3E"
            colors={['#1B4D3E']}
          />
        }
      >
        {/* State A: Active Search Loading */}
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B4D3E" />
            <Text style={styles.loadingText}>
              Searching global academic literature & registries...
            </Text>
          </View>
        )}

        {/* State B: Active Search Results */}
        {!isSearching && hasQuery && results && (
          <View style={styles.resultsContainer}>
            {/* Detected Intent Badge */}
            {detectedBadgeText && (
              <View style={styles.detectedPill}>
                <Sparkles size={12} color="#1B4D3E" />
                <Text style={styles.detectedPillText}>{detectedBadgeText}</Text>
              </View>
            )}

            {/* Sections (ordered dynamically based on active category & query intent) */}
            {activeCategory === 'papers' ? (
              renderPapersSection()
            ) : activeCategory === 'researchers' ? (
              renderResearchersSection()
            ) : showResearchersFirst ? (
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

        {/* State C: Discovery Feed (HYPED Section Matching Screenshot) */}
        {!hasQuery && (
          <>
            {/* Show Recent Searches if any */}
            {recentSearches.length > 0 && (
              <RecentSearchesList
                searches={recentSearches}
                onSelectSearch={handleSelectRecentOrTopic}
                onRemoveSearch={removeRecentSearch}
                onClearAll={clearRecentSearches}
              />
            )}

            {/* Render Domain Hyped Section */}
            {renderHypedDomainContent()}
          </>
        )}
      </ScrollView>

      {/* Add / Customize Interests Modal */}
      <AddInterestsModal
        visible={isAddInterestsVisible}
        onClose={() => setIsAddInterestsVisible(false)}
        onSaved={(newInterests) => {
          if (newInterests.length > 0) {
            setActiveTab(newInterests[0]);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  desktopSearchBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  topTabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topTabsContent: {
    paddingHorizontal: 16,
    gap: 22,
    alignItems: 'center',
  },
  topTabItem: {
    paddingVertical: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabItemActive: {
    // Active container
  },
  topTabText: {
    ...typography.body,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  topTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  topTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#0F172A',
    borderRadius: radii.full,
  },
  addInterestsTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginLeft: 4,
  },
  addInterestsTabText: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#1B4D3E',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  detectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  detectedPillText: {
    ...typography.captionBold,
    fontSize: 12,
    color: '#1B4D3E',
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.captionBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#64748B',
  },
  paperCardWrap: {
    marginBottom: 12,
  },
  researcherCardWrap: {
    marginBottom: 10,
  },
  loadMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radii.md,
    marginTop: 8,
  },
  loadMoreText: {
    ...typography.captionBold,
    color: '#1E293B',
  },
  hypedContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  hypedSectionHeader: {
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hypedMainTitle: {
    ...typography.h2,
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  seeAllAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllActionText: {
    ...typography.captionBold,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  hypedSubtitle: {
    ...typography.caption,
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 12,
  },
  timeframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeframePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeframePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: '#F1F5F9',
  },
  timeframePillActive: {
    backgroundColor: '#1B4D3E',
  },
  timeframePillText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: '#475569',
  },
  timeframePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterButtonText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  inlineLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inlineLoadingText: {
    ...typography.caption,
    color: '#64748B',
    fontSize: 12,
  },
  papersListContainer: {
    marginTop: 6,
    marginBottom: 20,
  },
  researchersSectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  researcherCarousel: {
    marginTop: 6,
    marginHorizontal: -16,
  },
  researcherCarouselContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
