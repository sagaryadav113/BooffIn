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
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
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
      executeExploreSearch(trimmed);
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
      <header style={{ width: '100%', backgroundColor: '#FFFFFF', borderBottom: '1px solid #F1F5F9', zIndex: 999 }}>
        <View style={styles.authContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)')}
            style={styles.logoSection}
          >
            <Image
              source={require('../../../assets/images/booffin-wordmark.jpg')}
              style={styles.brandLogoImage}
              contentFit="contain"
              accessibilityLabel="BooffIn"
            />
          </TouchableOpacity>
        </View>
      </header>
    );
  }

  return (
    <header style={{ width: '100%', backgroundColor: '#FFFFFF', zIndex: 999 }}>
      <View style={styles.container}>
        {/* Left: Official Brand Wordmark Logo */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)')}
          style={styles.logoSection}
        >
          <Image
            source={require('../../../assets/images/booffin-wordmark.jpg')}
            style={styles.brandLogoImage}
            contentFit="contain"
            accessibilityLabel="BooffIn"
          />
        </TouchableOpacity>

        {/* Center: Global Search Bar with Live Explore Dropdown */}
        <div
          ref={searchContainerRef}
          style={{ position: 'relative', width: 520, maxWidth: '48%' }}
        >
          <View style={[styles.searchContainer, isSearchOpen && styles.searchContainerActive]}>
            <Search size={18} color={isSearchOpen ? '#064E3B' : '#94A3B8'} strokeWidth={2.2} />
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
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  clearExploreSearch();
                }}
                style={{ padding: 4 }}
              >
                <X size={16} color="#94A3B8" />
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
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.15), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                zIndex: 1000,
                maxHeight: 520,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Filter Tabs */}
              <View style={styles.dropdownFilterRow}>
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
                      activeCategory === tab.key && styles.filterTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        activeCategory === tab.key && styles.filterTabTextActive,
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
                    <ActivityIndicator size="small" color="#064E3B" />
                    <Text style={styles.dropdownLoadingText}>Searching research database...</Text>
                  </View>
                ) : searchQuery.trim().length > 0 ? (
                  hasResults ? (
                    <View style={styles.dropdownResultsSection}>
                      {/* Researchers Section */}
                      {searchResults?.researchers && searchResults.researchers.length > 0 && (
                        <View style={styles.resultGroup}>
                          <View style={styles.groupHeader}>
                            <Users size={14} color="#64748B" />
                            <Text style={styles.groupTitle}>Researchers</Text>
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
                                <Text style={styles.researcherName} numberOfLines={1}>
                                  {res.fullName}
                                </Text>
                                <Text style={styles.researcherMeta} numberOfLines={1}>
                                  @{res.handle} {res.institution ? `· ${res.institution}` : ''}
                                </Text>
                              </View>
                              <ArrowRight size={14} color="#94A3B8" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Papers Section */}
                      {searchResults?.papers && searchResults.papers.length > 0 && (
                        <View style={styles.resultGroup}>
                          <View style={styles.groupHeader}>
                            <FileText size={14} color="#64748B" />
                            <Text style={styles.groupTitle}>Papers</Text>
                          </View>
                          {searchResults.papers.map((paper) => (
                            <TouchableOpacity
                              key={paper.id}
                              activeOpacity={0.7}
                              onPress={() => handleSelectPaper(paper.id)}
                              style={styles.paperRow}
                            >
                              <View style={styles.paperIconWrap}>
                                <FileText size={16} color="#064E3B" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.paperTitle} numberOfLines={1}>
                                  {paper.title}
                                </Text>
                                <Text style={styles.paperMeta} numberOfLines={1}>
                                  {[
                                    paper.journal,
                                    paper.publicationYear,
                                    paper.authors?.[0]?.name ? `${paper.authors[0].name} et al.` : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              </View>
                              <ArrowRight size={14} color="#94A3B8" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Topics Section */}
                      {searchResults?.topics && searchResults.topics.length > 0 && (
                        <View style={styles.resultGroup}>
                          <View style={styles.groupHeader}>
                            <Tag size={14} color="#64748B" />
                            <Text style={styles.groupTitle}>Topics</Text>
                          </View>
                          <View style={styles.topicChipGrid}>
                            {searchResults.topics.map((t) => (
                              <TouchableOpacity
                                key={t.id}
                                activeOpacity={0.7}
                                onPress={() => handleSelectTopic(t.slug || t.name)}
                                style={styles.topicChip}
                              >
                                <Text style={styles.topicChipText}>#{t.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.dropdownEmpty}>
                      <Text style={styles.dropdownEmptyTitle}>No results for "{searchQuery}"</Text>
                      <Text style={styles.dropdownEmptySub}>
                        Try searching by DOI, paper title, author name, or research keywords.
                      </Text>
                    </View>
                  )
                ) : (
                  /* Popular Discoveries Prompt when empty */
                  <View style={styles.discoveriesPrompt}>
                    <View style={styles.discoveriesHeader}>
                      <Sparkles size={14} color="#064E3B" />
                      <Text style={styles.discoveriesTitle}>Popular Research Topics</Text>
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
                          style={styles.popularTopicChip}
                        >
                          <Text style={styles.popularTopicChipText}>{disc.label}</Text>
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
                style={styles.dropdownFooter}
              >
                <Text style={styles.dropdownFooterText}>
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
          {/* Create / Share Post Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/create')}
            style={styles.createBtn}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.createBtnText}>New Post</Text>
          </TouchableOpacity>

          {/* Notifications Bell */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.iconBtn}
          >
            <Bell size={20} color="#334155" strokeWidth={2} />
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
              style={styles.userProfileBtn}
            >
              <Avatar
                uri={currentUser.avatarUrl}
                name={currentUser.fullName || currentUser.handle || 'Researcher'}
                size="sm"
              />
              <View style={styles.userMeta}>
                <Text style={styles.userName} numberOfLines={1}>
                  {currentUser.fullName || currentUser.handle}
                </Text>
                <Text style={styles.userHandle} numberOfLines={1}>
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
    width: 124,
    height: 38,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.full,
    borderWidth: 1.5,
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
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
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
