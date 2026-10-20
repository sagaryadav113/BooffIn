import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import {
  Search,
  Bell,
  Plus,
  Compass,
  User,
  FileText,
  Users,
  Tag,
  ArrowRight,
  Sparkles,
  X,
  Sun,
  Moon,
} from 'lucide-react-native';
import { colors, radii, spacing, typography, useTheme } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useExploreSearchStore } from '../../store/useExploreSearchStore';
import { searchBooffIn, POPULAR_DISCOVERIES } from '../../api/search/searchService';
import { SearchCategory, SearchResults } from '../../types';

interface DesktopHeaderProps {
  onSearch?: (query: string) => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ onSearch }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const currentUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const exploreQuery = useExploreSearchStore((s) => s.searchQuery);
  const setExploreQuery = useExploreSearchStore((s) => s.setSearchQuery);
  const executeExploreSearch = useExploreSearchStore((s) => s.executeSearch);
  const clearExploreSearch = useExploreSearchStore((s) => s.clearSearch);

  const [searchQuery, setSearchQuery] = useState(exploreQuery || '');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  const searchContainerRef = useRef<any>(null);
  const pathname = usePathname();
  const isExplorePage = pathname.includes('explore');
  const isMac = typeof navigator !== 'undefined' && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);

  // Keep local search input synchronized with explore search store
  useEffect(() => {
    setSearchQuery(exploreQuery);
  }, [exploreQuery]);

  // Global ⌘K keyboard shortcut listener on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('desktop-global-search-input');
        if (searchInput) {
          searchInput.focus();
          setIsSearchOpen(true);
        }
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchBooffIn({
          query: trimmed,
          category: activeCategory,
          limit: 6,
        });
        setSearchResults(res);
      } catch (err) {
        console.warn('[DesktopHeader] Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [searchQuery, activeCategory]);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    setIsSearchOpen(false);
    if (trimmed) {
      setExploreQuery(trimmed);
      executeExploreSearch(trimmed, true);
      if (onSearch) {
        onSearch(trimmed);
      } else if (!isExplorePage) {
        router.push('/(tabs)/explore');
      }
    } else if (!isExplorePage) {
      router.push('/(tabs)/explore');
    }
  };

  const handleSelectPaper = (paperId: string) => {
    setIsSearchOpen(false);
    router.push(`/paper/${paperId}`);
  };

  const handleSelectResearcher = (researcherId: string) => {
    setIsSearchOpen(false);
    router.push(`/profile/${researcherId}`);
  };

  const handleSelectTopic = (topicSlug: string) => {
    setIsSearchOpen(false);
    router.push(`/topic/${topicSlug}`);
  };

  const isAuthPage =
    pathname.includes('(auth)') ||
    pathname.includes('/login') ||
    pathname.includes('/signup') ||
    pathname.includes('/welcome') ||
    pathname.includes('/onboarding') ||
    pathname.includes('/email') ||
    pathname.includes('/forgot-password');

  const papersCount = searchResults?.papers?.length || 0;
  const researchersCount = searchResults?.researchers?.length || 0;
  const topicsCount = searchResults?.topics?.length || 0;
  const hasResults = papersCount > 0 || researchersCount > 0 || topicsCount > 0;

  if (isAuthPage) {
    return (
      <header style={{ width: '100%', backgroundColor: colors.background, borderBottom: `1px solid ${colors.border}`, zIndex: 999 }}>
        <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)')}
            style={styles.logoSection}
          >
            <Image
              source={require('../../../assets/images/booffin-wordmark.svg')}
              style={[styles.brandLogoImage, isDark && ({ filter: 'invert(1)' } as any)]}
              contentFit="contain"
              accessibilityLabel="BooffIn"
            />
          </TouchableOpacity>
        </View>
      </header>
    );
  }

  return (
    <header style={{ width: '100%', backgroundColor: colors.background, borderBottom: `1px solid ${colors.border}`, zIndex: 999 }}>
      <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {/* Left: Official Brand Wordmark Logo */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)')}
          style={styles.logoSection}
        >
          <Image
            source={require('../../../assets/images/booffin-wordmark.svg')}
            style={[styles.brandLogoImage, isDark && ({ filter: 'invert(1)' } as any)]}
            contentFit="contain"
            accessibilityLabel="BooffIn"
          />
        </TouchableOpacity>

        {/* Center: Global Search Bar with Live Explore Dropdown */}
        <div
          ref={searchContainerRef}
          style={{ position: 'relative', width: 520, maxWidth: '48%' }}
        >
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', borderColor: colors.border },
              isSearchOpen && styles.searchContainerActive,
            ]}
          >
            <Search size={18} color={isSearchOpen ? colors.brandGreen : colors.textMuted} strokeWidth={2.2} />
            <TextInput
              nativeID="desktop-global-search-input"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setExploreQuery(text);
                if (!isSearchOpen && !isExplorePage) setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (!isExplorePage) setIsSearchOpen(true);
              }}
              placeholder="Search papers, researchers, topics, methods..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  clearExploreSearch();
                }}
                style={{ padding: 4 }}
              >
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const searchInput = document.getElementById('desktop-global-search-input');
                  if (searchInput) {
                    searchInput.focus();
                    setIsSearchOpen(true);
                  }
                }}
                style={[
                  styles.shortcutBadge,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.shortcutText,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  {isMac ? '⌘K' : 'Ctrl K'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Live Search & Explore Dropdown Overlay */}
          {isSearchOpen && (
            <div
              style={{
                position: 'absolute',
                top: 50,
                left: 0,
                right: 0,
                backgroundColor: isDark ? colors.cardBackground : '#FFFFFF',
                borderRadius: 14,
                boxShadow: isDark
                  ? '0 16px 36px -4px rgba(0, 0, 0, 0.5), 0 4px 16px -2px rgba(0, 0, 0, 0.35)'
                  : '0 12px 32px -4px rgba(15, 23, 42, 0.15), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                border: `1px solid ${isDark ? colors.borderLight : '#E2E8F0'}`,
                overflow: 'hidden',
                zIndex: 1000,
                maxHeight: 520,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Filter Tabs */}
              <View style={[styles.dropdownFilterRow, { backgroundColor: isDark ? colors.backgroundSecondary : '#FAFAFA', borderBottomColor: colors.borderLight }]}>
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'papers', label: 'Papers' },
                    { key: 'researchers', label: 'Researchers' },
                    { key: 'topics', label: 'Topics' },
                  ] as const
                ).map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.7}
                    onPress={() => setActiveCategory(tab.key)}
                    style={[
                      styles.filterTab,
                      { backgroundColor: isDark ? colors.cardBackground : '#F1F5F9', borderWidth: 1, borderColor: isDark ? colors.borderLight : 'transparent' },
                      activeCategory === tab.key && [
                        styles.filterTabActive,
                        { backgroundColor: isDark ? '#10B981' : '#064E3B', borderColor: isDark ? '#10B981' : '#064E3B' },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        { color: colors.textSecondary },
                        activeCategory === tab.key && [
                          styles.filterTabTextActive,
                          { color: '#FFFFFF' },
                        ],
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Body */}
              <ScrollView
                style={{ maxHeight: 380 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {isSearching ? (
                  <View style={styles.dropdownLoading}>
                    <ActivityIndicator size="small" color={isDark ? "#34D399" : "#064E3B"} />
                    <Text style={[styles.dropdownLoadingText, { color: colors.textSecondary }]}>Searching research database...</Text>
                  </View>
                ) : searchQuery.trim().length > 0 ? (
                  hasResults ? (
                    <View style={styles.dropdownResultsSection}>
                      {/* Researchers Section */}
                      {searchResults?.researchers && searchResults.researchers.length > 0 && (
                        <View style={[styles.resultGroup, { borderBottomColor: colors.borderLight }]}>
                          <View style={styles.groupHeader}>
                            <Users size={14} color={colors.textSecondary} />
                            <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Researchers</Text>
                          </View>
                          {searchResults.researchers.map((res) => (
                            <TouchableOpacity
                              key={res.id}
                              activeOpacity={0.7}
                              onPress={() => handleSelectResearcher(res.id)}
                              style={styles.researcherRow}
                            >
                              <Avatar
                                uri={res.avatarUrl}
                                name={res.fullName || res.handle}
                                size="sm"
                              />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.researcherName, { color: colors.textPrimary }]} numberOfLines={1}>
                                  {res.fullName}
                                </Text>
                                <Text style={[styles.researcherMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                                  @{res.handle} {res.institution ? `· ${res.institution}` : ''}
                                </Text>
                              </View>
                              <ArrowRight size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Papers Section */}
                      {searchResults?.papers && searchResults.papers.length > 0 && (
                        <View style={[styles.resultGroup, { borderBottomColor: colors.borderLight }]}>
                          <View style={styles.groupHeader}>
                            <FileText size={14} color={colors.textSecondary} />
                            <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Papers</Text>
                          </View>
                          {searchResults.papers.map((paper) => (
                            <TouchableOpacity
                              key={paper.id}
                              activeOpacity={0.7}
                              onPress={() => handleSelectPaper(paper.id)}
                              style={styles.paperRow}
                            >
                              <View style={[styles.paperIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EAF3EE' }]}>
                                <FileText size={16} color={isDark ? "#34D399" : "#064E3B"} />
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.paperTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                  {paper.title}
                                </Text>
                                <Text style={[styles.paperMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                                  {[
                                    paper.journal,
                                    paper.publicationYear,
                                    paper.authors?.[0]?.name ? `${paper.authors[0].name} et al.` : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              </View>
                              <ArrowRight size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Topics Section */}
                      {searchResults?.topics && searchResults.topics.length > 0 && (
                        <View style={[styles.resultGroup, { borderBottomColor: colors.borderLight }]}>
                          <View style={styles.groupHeader}>
                            <Tag size={14} color={colors.textSecondary} />
                            <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Topics</Text>
                          </View>
                          <View style={styles.topicChipGrid}>
                            {searchResults.topics.map((t) => (
                              <TouchableOpacity
                                key={t.id}
                                activeOpacity={0.7}
                                onPress={() => handleSelectTopic(t.slug || t.name)}
                                style={[styles.topicChip, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EAF3EE', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#C8E1D5' }]}
                              >
                                <Text style={[styles.topicChipText, { color: isDark ? '#34D399' : '#064E3B' }]}>#{t.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.dropdownEmpty}>
                      <Text style={[styles.dropdownEmptyTitle, { color: colors.textPrimary }]}>No results for "{searchQuery}"</Text>
                      <Text style={[styles.dropdownEmptySub, { color: colors.textSecondary }]}>
                        Try searching by DOI, paper title, author name, or research keywords.
                      </Text>
                    </View>
                  )
                ) : (
                  /* Popular Discoveries Prompt when empty */
                  <View style={styles.discoveriesPrompt}>
                    <View style={styles.discoveriesHeader}>
                      <Sparkles size={14} color={isDark ? "#34D399" : "#064E3B"} />
                      <Text style={[styles.discoveriesTitle, { color: isDark ? "#34D399" : "#064E3B" }]}>Popular Research Topics</Text>
                    </View>
                    <View style={styles.topicChipGrid}>
                      {POPULAR_DISCOVERIES.map((disc, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSearchQuery(disc.query);
                            setExploreQuery(disc.query);
                            executeExploreSearch(disc.query);
                            setIsSearchOpen(false);
                            if (!isExplorePage) router.push('/(tabs)/explore');
                          }}
                          style={[styles.popularTopicChip, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', borderColor: colors.borderLight }]}
                        >
                          <Text style={[styles.popularTopicChipText, { color: colors.textPrimary }]}>{disc.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Footer to View All */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSearchSubmit}
                style={[styles.dropdownFooter, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', borderTopColor: colors.borderLight }]}
              >
                <Text style={[styles.dropdownFooterText, { color: isDark ? "#34D399" : "#064E3B" }]}>
                  {searchQuery.trim()
                    ? `See all results for "${searchQuery.trim()}" in Explore →`
                    : 'Open Full Explore & Search Page →'}
                </Text>
              </TouchableOpacity>
            </div>
          )}
        </div>

        {/* Right: Quick Actions & Profile */}
        <View style={styles.rightActions}>
          {/* Quick Theme Toggle Button (Desktop Only, to the left of New Post) */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={toggleTheme}
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
            accessibilityLabel={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            accessibilityRole="button"
          >
            {isDark ? (
              <Sun size={18} color="#FBBF24" strokeWidth={2.2} />
            ) : (
              <Moon size={18} color="#475569" strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          {/* Create / Share Post Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/create')}
            style={[styles.createBtn, { backgroundColor: colors.brandGreen }]}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.createBtnText}>New Post</Text>
          </TouchableOpacity>

          {/* Notifications Bell */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/notifications')}
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <Bell size={20} color={isDark ? colors.textPrimary : '#334155'} strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile Avatar / Menu */}
          {isAuthenticated && currentUser ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/profile')}
              style={[
                styles.userProfileBtn,
                {
                  backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <Avatar
                uri={currentUser.avatarUrl}
                name={currentUser.fullName || currentUser.handle || 'Researcher'}
                size="sm"
              />
              <View style={styles.userMeta}>
                <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {currentUser.fullName || currentUser.handle}
                </Text>
                <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                  @{currentUser.handle || 'scholar'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(auth)/login')}
              style={styles.signInBtn}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </header>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    maxWidth: 1440,
    marginHorizontal: 'auto' as any,
    width: '100%',
  },
  logoSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoImage: {
    width: 132,
    height: 34,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 42,
    width: '100%',
  },
  searchContainerActive: {
    borderColor: '#064E3B',
    backgroundColor: '#FFFFFF',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  shortcutBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    cursor: 'pointer' as any,
    userSelect: 'none' as any,
  },
  shortcutText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : undefined,
    letterSpacing: 0.4,
  },
  dropdownFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#064E3B',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  dropdownLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  dropdownResultsSection: {
    paddingVertical: 6,
  },
  resultGroup: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  groupTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  researcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  researcherName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  researcherMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  paperIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EAF3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  paperMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  topicChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topicChip: {
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#C8E1D5',
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
  },
  dropdownEmpty: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  dropdownEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  dropdownEmptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 320,
  },
  discoveriesPrompt: {
    padding: 16,
  },
  discoveriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  discoveriesTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#064E3B',
  },
  popularTopicChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  popularTopicChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownFooter: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  dropdownFooterText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#064E3B',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userMeta: {
    maxWidth: 120,
  },
  userName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  userHandle: {
    fontSize: 11,
    color: '#64748B',
  },
  signInBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  authContainer: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    maxWidth: 1200,
    marginHorizontal: 'auto' as any,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  authSwitchBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  authSwitchBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
