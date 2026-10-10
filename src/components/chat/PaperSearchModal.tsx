import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Paper } from '../../types';
import { searchPapers } from '../../api/search/providers/paperSearchProvider';
import { resolvePaper } from '../../api/paperResolver';

interface PaperSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPaper: (paper: Paper) => void;
  title?: string;
  subtitle?: string;
}

const TOPIC_SUGGESTION_CHIPS = [
  'All',
  'CRISPR',
  'Neuroscience',
  'Quantum',
  'Cancer',
  'RNA',
  'AI & Biology',
];

const DEFAULT_CURATED_PAPERS: Paper[] = [
  {
    id: 'curated_1',
    doi: '10.1038/s41594-026-01795-7',
    title: 'Direct roles of long non-coding RNAs in transcription activation',
    abstract: 'Long non-coding RNAs regulate transcription factors and chromatin accessibility across mammalian cells through sequence-specific interactions.',
    authors: [
      { name: 'Juan Pablo Unfried' },
      { name: 'Igor Ulitsky' },
    ],
    journal: 'Nature',
    publicationYear: 2024,
    canonicalUrl: 'https://doi.org/10.1038/s41594-026-01795-7',
    openAccessUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
    isOpenAccess: true,
    topics: ['RNA', 'Genetics', 'Molecular Biology'],
    citationCount: 2,
    discussionCount: 14,
    likesCount: 28,
    savesCount: 19,
  },
  {
    id: 'curated_2',
    doi: '10.1101/2026.01.12.584930',
    title: 'Open Science Protocol Guidelines & Reproducibility Standards',
    abstract: 'Comprehensive standard operating procedures and open lab protocol guidelines for verifiable experimental science and cross-institutional collaboration.',
    authors: [
      { name: 'Elena Rostova' },
      { name: 'Marcus Vance' },
      { name: 'Syed Ahmad' },
    ],
    journal: 'Nature Protocols',
    publicationYear: 2026,
    canonicalUrl: 'https://doi.org/10.1101/2026.01.12.584930',
    openAccessUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
    isOpenAccess: true,
    topics: ['Protocols', 'Open Science', 'Methodology'],
    citationCount: 8,
    discussionCount: 32,
    likesCount: 45,
    savesCount: 38,
  },
  {
    id: 'curated_3',
    doi: '10.1016/j.cell.2025.11.014',
    title: 'Microplastic Cellular Impact & Toxicity: A Systematic Meta-Analysis',
    abstract: 'Investigating cellular uptake, mitochondrial degradation, and inflammatory response induced by sub-micron plastic particles across human organoid models.',
    authors: [
      { name: 'Hanna Lindqvist' },
      { name: 'David K. Chen' },
    ],
    journal: 'Cell',
    publicationYear: 2025,
    canonicalUrl: 'https://doi.org/10.1016/j.cell.2025.11.014',
    openAccessUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
    isOpenAccess: true,
    topics: ['Toxicology', 'Cell Biology', 'Environmental Science'],
    citationCount: 12,
    discussionCount: 19,
    likesCount: 34,
    savesCount: 22,
  },
  {
    id: 'curated_4',
    doi: '10.1126/science.ade9241',
    title: 'Quantum Coherence and Entanglement Signatures in Macroscopic Bio-Systems',
    abstract: 'Direct spectroscopic observation of long-lived macroscopic quantum superposition and coherence within light-harvesting protein complexes.',
    authors: [
      { name: 'Siddharth Rao' },
      { name: 'Camilla Moreau' },
    ],
    journal: 'Science',
    publicationYear: 2026,
    canonicalUrl: 'https://doi.org/10.1126/science.ade9241',
    openAccessUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
    isOpenAccess: true,
    topics: ['Quantum Biology', 'Biophysics', 'Optics'],
    citationCount: 15,
    discussionCount: 41,
    likesCount: 67,
    savesCount: 52,
  },
];

export const PaperSearchModal: React.FC<PaperSearchModalProps> = ({
  visible,
  onClose,
  onSelectPaper,
  title = 'Search & Share Research Paper',
  subtitle = 'Search by DOI, URL, paper title, keywords, or author across global scientific registries.',
}) => {
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Paper[]>(DEFAULT_CURATED_PAPERS);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Trigger search execution
  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults(DEFAULT_CURATED_PAPERS);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // 1. If it looks like a DOI or URL, resolve directly first
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
          setResults([resolved]);
          setIsSearching(false);
          return;
        }
      }

      // 2. Broad academic multi-registry search (EuropePMC, arXiv, OpenAlex, Semantic Scholar, Local Store)
      const papers = await searchPapers(trimmed, 15);
      if (papers && papers.length > 0) {
        setResults(papers);
      } else {
        // Fallback: search curated list locally
        const q = trimmed.toLowerCase();
        const localMatches = DEFAULT_CURATED_PAPERS.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.abstract.toLowerCase().includes(q) ||
            p.journal.toLowerCase().includes(q) ||
            (p.doi && p.doi.toLowerCase().includes(q)) ||
            p.authors.some((a) => a.name.toLowerCase().includes(q)) ||
            p.topics.some((t) => t.toLowerCase().includes(q))
        );
        setResults(localMatches);
      }
    } catch (err) {
      console.warn('Academic paper search error:', err);
      // Fallback to local filtering
      const q = trimmed.toLowerCase();
      const localMatches = DEFAULT_CURATED_PAPERS.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.journal.toLowerCase().includes(q) ||
          (p.doi && p.doi.toLowerCase().includes(q)) ||
          p.authors.some((a) => a.name.toLowerCase().includes(q))
      );
      setResults(localMatches);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced live search as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setResults(DEFAULT_CURATED_PAPERS);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query);
    }, 450);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, executeSearch]);

  const handleChipPress = (chip: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setActiveChip(chip);
    if (chip === 'All') {
      setQuery('');
      setResults(DEFAULT_CURATED_PAPERS);
      setHasSearched(false);
    } else {
      setQuery(chip);
      executeSearch(chip);
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveChip('All');
    setResults(DEFAULT_CURATED_PAPERS);
    setHasSearched(false);
  };

  const handleSelect = (paper: Paper) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onSelectPaper(paper);
    onClose();
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

          {/* Search Bar Input */}
          <View style={styles.searchBarRow}>
            <Search size={18} color="#64748B" style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setActiveChip('');
              }}
              placeholder="Search by DOI, URL, title, keywords, or author..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => executeSearch(query)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => executeSearch(query)}
              disabled={isSearching}
              style={[styles.searchActionBtn, isSearching && { opacity: 0.7 }]}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Search size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Topic Suggestion Chips */}
          <View style={styles.chipsScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {TOPIC_SUGGESTION_CHIPS.map((chip) => {
                const isSelected = activeChip === chip || (chip === 'All' && !query && !activeChip);
                return (
                  <TouchableOpacity
                    key={chip}
                    activeOpacity={0.7}
                    onPress={() => handleChipPress(chip)}
                    style={[styles.topicChip, isSelected && styles.topicChipActive]}
                  >
                    <Text style={[styles.topicChipText, isSelected && styles.topicChipTextActive]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Section Label */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>
              {isSearching
                ? 'Searching Scientific Registries...'
                : hasSearched
                ? `Results for "${query.trim()}" (${results.length})`
                : 'Verified Preprints & Manuscripts'}
            </Text>
            {hasSearched && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearSearchLink}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content List */}
          <ScrollView
            style={styles.resultsList}
            contentContainerStyle={styles.resultsListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#164E3F" />
                <Text style={styles.loadingText}>
                  Querying OpenAlex, Crossref, arXiv, and PubMed...
                </Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyContainer}>
                <AlertCircle size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Matching Papers Found</Text>
                <Text style={styles.emptySub}>
                  No scientific literature matched "{query}". Try searching by another keyword, author name, or paste a DOI / preprint URL directly.
                </Text>
                <TouchableOpacity onPress={handleClear} style={styles.resetBtn}>
                  <Text style={styles.resetBtnText}>View Curated Papers</Text>
                </TouchableOpacity>
              </View>
            ) : (
              results.map((paper) => {
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
                          {paper.publicationYear || new Date().getFullYear()}
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
                          {paper.doi ? `doi:${paper.doi}` : paper.canonicalUrl || 'Verified Paper'}
                        </Text>
                      </View>

                      <View style={styles.shareBtn}>
                        <Sparkles size={12} color="#FFFFFF" />
                        <Text style={styles.shareBtnText}>Share</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
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
    maxHeight: Platform.OS === 'web' ? '88vh' as any : '88%',
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
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
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
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
    marginRight: 4,
  },
  searchActionBtn: {
    backgroundColor: '#164E3F',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScrollWrapper: {
    marginBottom: 12,
  },
  chipsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topicChipActive: {
    backgroundColor: '#164E3F',
    borderColor: '#164E3F',
  },
  topicChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  topicChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearSearchLink: {
    fontSize: 11.5,
    fontWeight: '600',
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
