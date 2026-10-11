import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Search,
  X,
  FileText,
  ExternalLink,
  Sparkles,
  BookOpen,
  Bookmark,
  Globe,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Paper } from '../../types';
import { searchPapers } from '../../api/search/providers/paperSearchProvider';
import { resolvePaper } from '../../api/paperResolver';
import { useAuthStore } from '../../store/useAuthStore';
import { usePaperStore } from '../../store/usePaperStore';
import { fetchSavedPostsAndPapers } from '../../api/socialService';

interface PaperSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPaper: (paper: Paper) => void;
  title?: string;
  subtitle?: string;
}

export const PaperSearchModal: React.FC<PaperSearchModalProps> = ({
  visible,
  onClose,
  onSelectPaper,
  title = 'Select Manuscript / Paper to Share',
  subtitle = 'Search global scientific registries or share directly from your bookmarks.',
}) => {
  // 1. Global Academic Search State
  const [globalQuery, setGlobalQuery] = useState('');
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalResults, setGlobalResults] = useState<Paper[]>([]);
  const [hasSearchedGlobal, setHasSearchedGlobal] = useState(false);

  // 2. Bookmarked / Saved Papers State
  const [bookmarkedPapers, setBookmarkedPapers] = useState<Paper[]>([]);
  const [bookmarkSearchQuery, setBookmarkSearchQuery] = useState('');
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);

  // Load Bookmarked papers whenever modal opens
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    // A. Seed immediately from usePaperStore cache
    const storeState = usePaperStore.getState();
    const localSaved = (storeState.papers || []).filter(
      (p) =>
        storeState.savedPaperIds.has(p.id) ||
        (p.doi && storeState.savedPaperIds.has(p.doi)) ||
        p.isSaved
    );
    if (localSaved.length > 0) {
      setBookmarkedPapers(localSaved);
      setIsLoadingBookmarks(false);
    } else {
      setIsLoadingBookmarks(true);
    }

    // B. Fetch fresh saved papers from database
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      (async () => {
        try {
          const res = await fetchSavedPostsAndPapers(userId);
          if (isMounted && res.papers) {
            setBookmarkedPapers(res.papers);
          }
        } catch (err) {
          console.warn('[PaperSearchModal] Failed to fetch saved papers:', err);
        } finally {
          if (isMounted) setIsLoadingBookmarks(false);
        }
      })();
    } else {
      setIsLoadingBookmarks(false);
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Execute Global Search
  const executeGlobalSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setGlobalResults([]);
      setIsSearchingGlobal(false);
      setHasSearchedGlobal(false);
      return;
    }

    setIsSearchingGlobal(true);
    setHasSearchedGlobal(true);

    try {
      // 1. Check if query is DOI or direct URL
      const isDoiOrUrl =
        trimmed.startsWith('10.') ||
        trimmed.includes('doi.org/') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.includes('arxiv.org') ||
        trimmed.includes('biorxiv.org');

      if (isDoiOrUrl) {
        const resolved = await resolvePaper(trimmed);
        if (resolved) {
          setGlobalResults([resolved]);
          setIsSearchingGlobal(false);
          return;
        }
      }

      // 2. Broad academic multi-registry search (EuropePMC, arXiv, OpenAlex, Semantic Scholar)
      const papers = await searchPapers(trimmed, 15);
      if (papers && papers.length > 0) {
        setGlobalResults(papers);
      } else {
        setGlobalResults([]);
      }
    } catch (err) {
      console.warn('Academic paper global search error:', err);
      setGlobalResults([]);
    } finally {
      setIsSearchingGlobal(false);
    }
  }, []);

  // Filter bookmarked papers by the in-bookmarks search term
  const filteredBookmarks = useMemo(() => {
    const q = bookmarkSearchQuery.trim().toLowerCase();
    if (!q) return bookmarkedPapers;

    return bookmarkedPapers.filter((p) => {
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchAbstract = (p.abstract || '').toLowerCase().includes(q);
      const matchJournal = (p.journal || '').toLowerCase().includes(q);
      const matchDoi = (p.doi || '').toLowerCase().includes(q);
      const matchAuthors = (p.authors || []).some((a) => (a.name || '').toLowerCase().includes(q));
      return matchTitle || matchAbstract || matchJournal || matchDoi || matchAuthors;
    });
  }, [bookmarkedPapers, bookmarkSearchQuery]);

  const handleClearGlobal = () => {
    setGlobalQuery('');
    setGlobalResults([]);
    setHasSearchedGlobal(false);
  };

  const handleClearBookmarkSearch = () => {
    setBookmarkSearchQuery('');
  };

  const handleSelect = (paper: Paper) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onSelectPaper(paper);
    onClose();
  };

  const renderPaperCard = (paper: Paper) => {
    const authorsText = (paper.authors || [])
      .map((a) => a.name)
      .slice(0, 3)
      .join(', ') + ((paper.authors?.length || 0) > 3 ? ' et al.' : '');

    return (
      <TouchableOpacity
        key={paper.id}
        activeOpacity={0.75}
        onPress={() => handleSelect(paper)}
        style={styles.paperCard}
      >
        {/* Header: Journal Pill & Year */}
        <View style={styles.paperCardTop}>
          <View style={styles.journalBadge}>
            <BookOpen size={12} color="#164E3F" />
            <Text style={styles.journalBadgeText}>{paper.journal || 'Academic Literature'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {paper.isOpenAccess && (
              <View style={styles.oaBadge}>
                <Text style={styles.oaBadgeText}>PDF</Text>
              </View>
            )}
            <Text style={styles.yearText}>
              {paper.publicationYear || (paper as any).publication_year || new Date().getFullYear()}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.paperTitle} numberOfLines={2}>
          {paper.title}
        </Text>

        {/* Authors & Citations */}
        <Text style={styles.paperAuthors} numberOfLines={1}>
          {authorsText || 'Academic Researcher'}
          {paper.citationCount !== undefined && paper.citationCount > 0
            ? ` • ${paper.citationCount} citations`
            : ''}
        </Text>

        {/* Abstract snippet */}
        {paper.abstract ? (
          <Text style={styles.paperAbstract} numberOfLines={2}>
            {paper.abstract}
          </Text>
        ) : null}

        {/* Footer: DOI / Link & Share Button */}
        <View style={styles.paperCardBottom}>
          <View style={styles.doiTag}>
            <ExternalLink size={11} color="#64748B" />
            <Text style={styles.doiTagText} numberOfLines={1}>
              {paper.doi ? `doi:${paper.doi}` : paper.canonicalUrl || (paper as any).canonical_url || 'Verified Paper'}
            </Text>
          </View>

          <View style={styles.shareBtn}>
            <Sparkles size={12} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <View style={styles.headerIconCircle}>
                <FileText size={18} color="#164E3F" />
              </View>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>{subtitle}</Text>

          {/* 1. Global Search Area */}
          <View style={styles.searchBarRow}>
            <Globe size={18} color="#059669" style={styles.searchIcon} />
            <TextInput
              value={globalQuery}
              onChangeText={setGlobalQuery}
              placeholder="Global search by DOI, URL, title, or keywords..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => executeGlobalSearch(globalQuery)}
            />
            {globalQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearGlobal} style={styles.clearBtn}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => executeGlobalSearch(globalQuery)}
              disabled={isSearchingGlobal || !globalQuery.trim()}
              style={[styles.searchActionBtn, (!globalQuery.trim() || isSearchingGlobal) && { opacity: 0.7 }]}
            >
              {isSearchingGlobal ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Search size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* 2. Global Results Mode or Bookmarks Mode */}
          {hasSearchedGlobal ? (
            /* Global Results Mode */
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <Globe size={14} color="#059669" />
                <Text style={styles.sectionHeaderTitle} numberOfLines={1}>
                  {isSearchingGlobal
                    ? 'Searching Global Registries...'
                    : `Global Results for "${globalQuery.trim()}" (${globalResults.length})`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearGlobal}
                style={styles.backToBookmarksBtn}
                activeOpacity={0.7}
              >
                <ArrowLeft size={12} color="#164E3F" />
                <Text style={styles.backToBookmarksText}>Your Bookmarks</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Bookmarks Mode */
            <>
              <View style={styles.bookmarksHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Bookmark size={15} color="#164E3F" fill="#164E3F" />
                  <Text style={styles.bookmarksSectionTitle}>Your Bookmarks</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{bookmarkedPapers.length}</Text>
                  </View>
                </View>
                <Text style={styles.bookmarksHintText}>Saved papers from your profile</Text>
              </View>

              {/* In-Bookmarks Search Bar */}
              <View style={styles.bookmarkSearchRow}>
                <Search size={15} color="#64748B" style={{ marginLeft: 10, marginRight: 6 }} />
                <TextInput
                  value={bookmarkSearchQuery}
                  onChangeText={setBookmarkSearchQuery}
                  placeholder="Search in your bookmarks..."
                  placeholderTextColor="#94A3B8"
                  style={styles.bookmarkSearchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {bookmarkSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={handleClearBookmarkSearch} style={styles.clearBtn}>
                    <X size={14} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Content List */}
          <ScrollView
            style={styles.resultsList}
            contentContainerStyle={styles.resultsListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {hasSearchedGlobal ? (
              /* Global Search Results */
              isSearchingGlobal ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#164E3F" />
                  <Text style={styles.loadingText}>
                    Querying OpenAlex, Crossref, arXiv, and PubMed...
                  </Text>
                </View>
              ) : globalResults.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AlertCircle size={36} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Matching Papers Found</Text>
                  <Text style={styles.emptySub}>
                    No global literature matched "{globalQuery}". Try searching by another title, author, or full DOI.
                  </Text>
                  <TouchableOpacity onPress={handleClearGlobal} style={styles.resetBtn}>
                    <Text style={styles.resetBtnText}>Back to Your Bookmarks</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                globalResults.map(renderPaperCard)
              )
            ) : (
              /* Bookmarks List */
              isLoadingBookmarks ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#164E3F" />
                  <Text style={styles.loadingText}>Loading your bookmarked papers...</Text>
                </View>
              ) : bookmarkedPapers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Bookmark size={36} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Bookmarked Papers Yet</Text>
                  <Text style={styles.emptySub}>
                    Papers you save across BooffIn will appear here so you can easily share them directly to workspace chats.
                  </Text>
                  <Text style={[styles.emptySub, { marginTop: 4, color: '#059669', fontWeight: '600' }]}>
                    Tip: Use the Global Search bar above to find and share any paper!
                  </Text>
                </View>
              ) : filteredBookmarks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AlertCircle size={36} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Bookmarks Found</Text>
                  <Text style={styles.emptySub}>
                    No saved papers match "{bookmarkSearchQuery}". Try searching globally above.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setGlobalQuery(bookmarkSearchQuery);
                      executeGlobalSearch(bookmarkSearchQuery);
                    }}
                    style={styles.resetBtn}
                  >
                    <Text style={styles.resetBtnText}>Search Globally Instead</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredBookmarks.map(renderPaperCard)
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: Platform.OS === 'web' ? ('88vh' as any) : '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 6,
  },
  searchActionBtn: {
    backgroundColor: '#164E3F',
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  bookmarksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  bookmarksSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  bookmarksHintText: {
    fontSize: 11,
    color: '#64748B',
  },
  bookmarkSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 10,
    height: 36,
  },
  bookmarkSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 6,
    paddingRight: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  backToBookmarksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  backToBookmarksText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  resultsList: {
    flex: 1,
    minHeight: 180,
  },
  resultsListContent: {
    gap: 10,
    paddingBottom: 8,
  },
  paperCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  paperCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  journalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  journalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  oaBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  oaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  yearText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  paperTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  paperAuthors: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 6,
  },
  paperAbstract: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  paperCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  doiTagText: {
    fontSize: 10.5,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#164E3F',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  shareBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
  resetBtn: {
    marginTop: 10,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#164E3F',
  },
});
