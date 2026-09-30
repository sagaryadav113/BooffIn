import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Share,
  RefreshControl,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import {
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Share2,
  BookOpen,
  FileText,
  Send,
  X,
  FileCheck,
  Globe,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Flame,
} from 'lucide-react-native';
import { FloatingRatingDock } from '../../components/paper/FloatingRatingDock';
import { InAppPaperPdfViewer } from '../../components/paper/InAppPaperPdfViewer';
import { HypeScoreBadge } from '../../components/paper/HypeScoreBadge';
import { getPaperMetrics, recordPaperView, PaperMetrics } from '../../api/hypeScoreService';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Badge } from '../../components/core/Badge';
import { TopicChip } from '../../components/core/TopicChip';
import { IconButton } from '../../components/core/IconButton';
import { Typography } from '../../components/core/Typography';
import { DiscussionIcon } from '../../components/core/DiscussionIcon';
import { LikeButton } from '../../components/core/LikeButton';
import { Avatar } from '../../components/core/Avatar';
import { EmptyState } from '../../components/feedback/EmptyState';
import { CommentCard } from '../../components/cards/CommentCard';
import { usePaperStore } from '../../store/usePaperStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import { useDiscussionStore } from '../../store/useDiscussionStore';
import {
  DiscussionTypePills,
  DiscussionComposer,
  DiscussionCard,
  ParticipatingResearchers,
  PeopleInterestedSection,
} from '../../components/discussion';
import { Comment, DiscussionType, Paper } from '../../types';

import { usePaperFigures } from '../../hooks/usePaperFigures';
import { fetchDirectOpenAccessPdf } from '../../api/paper/metadataResolver';
import { resolvePaperWithDetails } from '../../api/paperResolver';

function createPaperFromReference(ref: any): Paper {
  return {
    id: ref.paperId || ref.id,
    doi: ref.doi,
    title: ref.title || 'Research Publication',
    abstract: ref.abstract || '',
    authors: (ref.authors || []).map((name: any, i: number) => ({
      name: typeof name === 'string' ? name : name?.name || 'Researcher',
      authorOrder: i + 1,
    })),
    journal: ref.journal || ref.journalOrConference || 'Academic Literature',
    publicationYear: ref.publicationYear || new Date().getFullYear(),
    canonicalUrl: ref.url || (ref.doi ? `https://doi.org/${ref.doi}` : ''),
    openAccessUrl: ref.openAccessPdfUrl || (ref.url && ref.url.toLowerCase().endsWith('.pdf') ? ref.url : undefined),
    isOpenAccess: !!ref.openAccessPdfUrl || !!(ref.url && ref.url.toLowerCase().endsWith('.pdf')),
    topics: [],
    citationCount: 0,
    discussionCount: 0,
    likesCount: 0,
    savesCount: 0,
  };
}

export default function PaperDetailScreen() {
  const { id, fromPostId, doi, title, url, pdfUrl, refId, mode } = useLocalSearchParams<{
    id: string;
    fromPostId?: string;
    doi?: string;
    title?: string;
    url?: string;
    pdfUrl?: string;
    refId?: string;
    mode?: 'article' | 'pdf';
  }>();
  const rawId = id ? decodeURIComponent(id) : '';
  const paperId = rawId || id || '';
  const activePostId = fromPostId || '';

  const getPaperById = usePaperStore((s) => s.getPaperById);
  const fetchPaperById = usePaperStore((s) => s.fetchPaperById);
  const toggleSavePaper = usePaperStore((s) => s.toggleSavePaper);
  const toggleLikePaper = usePaperStore((s) => s.toggleLikePaper);
  const currentUser = useAuthStore((s) => s.user);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const [paperMetrics, setPaperMetrics] = useState<PaperMetrics | null>(null);

  // Initialize HYPE score and record paper view on open
  useEffect(() => {
    let isMounted = true;
    const targetId = paperId || doi;
    if (targetId) {
      recordPaperView(targetId).then((m) => {
        if (isMounted) setPaperMetrics(m);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [paperId, doi]);

  // Stable Post & Comments Store Selectors
  const getCommentsForPost = usePostStore((s) => s.getCommentsForPost);
  const commentsMap = usePostStore((s) => s.comments);
  const fetchCommentsForPost = usePostStore((s) => s.fetchCommentsForPost);
  const addPostComment = usePostStore((s) => s.addComment);
  const deletePostComment = usePostStore((s) => s.deleteComment);
  const toggleLikeComment = usePostStore((s) => s.toggleLikeComment);

  // Stable Discussion Store Selectors
  const discussionsMap = useDiscussionStore((s) => s.discussions);
  const fetchDiscussionsForPaper = useDiscussionStore((s) => s.fetchDiscussionsForPaper);
  const activeFilter = useDiscussionStore((s) => s.activeFilter);
  const setActiveFilter = useDiscussionStore((s) => s.setActiveFilter);
  const addDiscussion = useDiscussionStore((s) => s.addDiscussion);
  const addReply = useDiscussionStore((s) => s.addReply);
  const toggleLikeDiscussion = useDiscussionStore((s) => s.toggleLikeDiscussion);
  const toggleLikeReply = useDiscussionStore((s) => s.toggleLikeReply);
  const getParticipatingResearchers = useDiscussionStore((s) => s.getParticipatingResearchers);
  const getInterestedPeople = useDiscussionStore((s) => s.getInterestedPeople);

  // Derive initial paper object from local state, post, or article references
  const initialPaper = useMemo(() => {
    let p = getPaperById(paperId) || (doi ? getPaperById(doi) : undefined);

    // 1. Check activePost first
    if (!p && activePostId) {
      const activePost = usePostStore.getState().getPostById(activePostId);
      if (
        activePost?.paper &&
        (activePost.paper.id === paperId ||
          activePost.paper.doi === paperId ||
          (doi && activePost.paper.doi === doi))
      ) {
        p = activePost.paper;
      }
      if (!p && activePost?.article?.references) {
        const foundRef = activePost.article.references.find(
          (r) =>
            r.id === refId ||
            r.id === paperId ||
            r.paperId === paperId ||
            (r.doi && (r.doi === paperId || (doi && r.doi === doi))) ||
            (r.url && (r.url === paperId || (url && r.url === url))) ||
            (title && r.title.toLowerCase() === title.toLowerCase())
        );
        if (foundRef) {
          p = createPaperFromReference(foundRef);
        }
      }
    }

    // 2. Check all posts in postStore
    if (!p) {
      const allPosts = usePostStore.getState().posts;
      for (const item of allPosts) {
        if (
          item.paper &&
          (item.paper.id === paperId ||
            item.paper.doi === paperId ||
            (doi && item.paper.doi === doi))
        ) {
          p = item.paper;
          break;
        }
        if (item.article?.references) {
          const foundRef = item.article.references.find(
            (r) =>
              r.id === refId ||
              r.id === paperId ||
              r.paperId === paperId ||
              (r.doi && (r.doi === paperId || (doi && r.doi === doi))) ||
              (r.url && (r.url === paperId || (url && r.url === url))) ||
              (title && r.title.toLowerCase() === title.toLowerCase())
          );
          if (foundRef) {
            p = createPaperFromReference(foundRef);
            break;
          }
        }
      }
    }

    // 3. Fallback from query params if available
    if (!p && (title || doi || url || pdfUrl)) {
      p = {
        id: paperId || `paper_${Date.now()}`,
        doi: doi || (paperId.startsWith('10.') ? paperId : undefined),
        title: title ? decodeURIComponent(title) : 'Research Publication',
        abstract: '',
        authors: [],
        journal: 'Academic Literature',
        publicationYear: new Date().getFullYear(),
        canonicalUrl: url || (doi ? `https://doi.org/${doi}` : ''),
        openAccessUrl: pdfUrl || (url && url.toLowerCase().endsWith('.pdf') ? url : undefined),
        isOpenAccess: !!pdfUrl || !!(url && url.toLowerCase().endsWith('.pdf')),
        topics: [],
        citationCount: 0,
        discussionCount: 0,
        likesCount: 0,
        savesCount: 0,
      };
    }

    return p || null;
  }, [paperId, activePostId, getPaperById, doi, title, url, pdfUrl, refId]);

  const [paper, setPaper] = useState<Paper | null>(initialPaper);
  const resolvedFigures = usePaperFigures(paper);
  const [isLoading, setIsLoading] = useState(!initialPaper);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reader View Mode: 'article' (Substack format) vs 'pdf' (Open Access Document)
  const [viewMode, setViewMode] = useState<'article' | 'pdf'>(mode === 'pdf' ? 'pdf' : 'article');

  // Zoom State for PDF Reader (0.75x to 2.5x)
  const [pdfZoom, setPdfZoom] = useState(1.0);

  const handleZoomIn = () => {
    setPdfZoom((prev) => Math.min(2.5, +(prev + 0.25).toFixed(2)));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleZoomOut = () => {
    setPdfZoom((prev) => Math.max(0.75, +(prev - 0.25).toFixed(2)));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleResetZoom = () => {
    setPdfZoom(1.0);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  // Discussion / Comment State
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Memoized comments and discussions to prevent selector reference thrashing
  const postComments = useMemo(() => {
    return activePostId ? getCommentsForPost(activePostId) : [];
  }, [activePostId, commentsMap, getCommentsForPost]);

  const discussions = useMemo(() => {
    return (paperId && discussionsMap[paperId]) ? discussionsMap[paperId] : [];
  }, [paperId, discussionsMap]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!paperId && !doi && !url && !title) {
      setIsLoading(false);
      return;
    }

    // Try finding paper in paperStore, postStore, or article references
    let currentPaper = initialPaper || getPaperById(paperId) || (doi ? getPaperById(doi) : undefined);
    if (!currentPaper && activePostId) {
      const activePost = usePostStore.getState().getPostById(activePostId);
      if (activePost?.paper) currentPaper = activePost.paper;
      if (!currentPaper && activePost?.article?.references) {
        const foundRef = activePost.article.references.find(
          (r) =>
            r.id === refId ||
            r.id === paperId ||
            r.paperId === paperId ||
            (r.doi && (r.doi === paperId || (doi && r.doi === doi)))
        );
        if (foundRef) currentPaper = createPaperFromReference(foundRef);
      }
    }
    if (!currentPaper) {
      const allPosts = usePostStore.getState().posts;
      for (const item of allPosts) {
        if (item.paper && (item.paper.id === paperId || item.paper.doi === paperId)) {
          currentPaper = item.paper;
          break;
        }
        if (item.article?.references) {
          const foundRef = item.article.references.find(
            (r) =>
              r.id === refId ||
              r.id === paperId ||
              r.paperId === paperId ||
              (r.doi && (r.doi === paperId || (doi && r.doi === doi)))
          );
          if (foundRef) {
            currentPaper = createPaperFromReference(foundRef);
            break;
          }
        }
      }
    }

    if (currentPaper) {
      setPaper(currentPaper);
      setIsLoading(false);
    } else if (!isRefresh) {
      setIsLoading(true);
    }

    // Try fetching from Supabase database
    try {
      const fetched = await fetchPaperById(paperId);
      if (fetched) {
        currentPaper = fetched;
        setPaper(fetched);
      }
    } catch (e) {}

    // Online resolver fallback:
    // If paper still missing, or missing abstract or openAccessUrl, resolve online
    const lookupKey =
      currentPaper?.doi ||
      doi ||
      (paperId.includes('/') || paperId.includes('10.') || paperId.startsWith('http') ? paperId : null) ||
      currentPaper?.canonicalUrl ||
      url ||
      currentPaper?.title ||
      title;

    if (lookupKey && (!currentPaper || !currentPaper.abstract || !currentPaper.openAccessUrl)) {
      try {
        const res = await resolvePaperWithDetails(lookupKey);
        if (res.paper) {
          const enriched: Paper = {
            ...(currentPaper || res.paper),
            ...res.paper,
            id: currentPaper?.id || res.paper.id,
            openAccessUrl: res.paper.openAccessUrl || currentPaper?.openAccessUrl,
            canonicalUrl: res.paper.canonicalUrl || currentPaper?.canonicalUrl || '',
          };
          setPaper(enriched);
          usePaperStore.getState().addPaper(enriched);
          currentPaper = enriched;
        }
      } catch (err) {
        console.warn('Paper resolver fallback warning:', err);
      }
    }

    try {
      if (activePostId) {
        await fetchCommentsForPost(activePostId, currentUser?.id);
      } else if (paperId) {
        await fetchDiscussionsForPaper(paperId, currentUser?.id);
      }
    } catch (e) {}

    setIsLoading(false);
    if (isRefresh) setIsRefreshing(false);
  }, [paperId, activePostId, currentUser?.id, getPaperById, fetchPaperById, fetchCommentsForPost, fetchDiscussionsForPaper, doi, title, url, refId, initialPaper]);

  useEffect(() => {
    loadData();
  }, [paperId, activePostId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadData(true);
  };

  const handleShare = async () => {
    if (!paper) return;
    try {
      await Share.share({
        message: `${paper.title}\n${paper.canonicalUrl || paper.openAccessUrl}\nDiscussed on BooffIn: Where scientific research finds its people.`,
      });
    } catch {}
  };

  const handleSave = () => {
    if (!paper) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSavePaper(paper.id, currentUser?.id);
  };

  const handleLike = () => {
    if (!paper) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleLikePaper(paper.id);
  };

  /**
   * PDF URL Priority Chain
   *
   * Priority (most embeddable first):
   *   1. arXiv PDF  — freely embeddable, highly reliable
   *   2. NIH PubMed Central PDF — embeddable (ncbi.nlm.nih.gov), not EuropePMC which blocks iframes
   *   3. Any direct .pdf URL that isn't EuropePMC ptpmcrender (those block iframes)
   *   4. openAccessUrl if it's a non-EuropePMC direct PDF stream
   *
   * EuropePMC ptpmcrender.fcgi URLs are deliberately excluded from the iframe source
   * because europepmc.org sets X-Frame-Options: SAMEORIGIN.
   */
  const resolvedPdfUrl = useMemo(() => {
    const allUrls: string[] = [
      paper?.openAccessUrl || '',
      paper?.canonicalUrl || '',
    ].filter(Boolean);

    // Helper: extract arXiv ID from any arXiv URL
    const getArxivPdfUrl = (url: string): string => {
      const absMatch = url.match(/arxiv\.org\/abs\/([\w.]+)/i);
      if (absMatch) return `https://arxiv.org/pdf/${absMatch[1]}.pdf`;
      const pdfMatch = url.match(/arxiv\.org\/pdf\/(\S+)/i);
      if (pdfMatch) {
        const id = pdfMatch[1].replace(/\.pdf$/i, '');
        return `https://arxiv.org/pdf/${id}.pdf`;
      }
      return '';
    };

    // Helper: extract PMC ID and build NIH PDF URL (not EuropePMC — NIH allows embedding)
    const getNihPmcPdfUrl = (url: string): string => {
      const pmcMatch = url.match(/PMC(\d+)/i);
      if (pmcMatch) {
        // NIH PMC article page — browser renders PDF inline without X-Frame-Options block
        return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcMatch[1]}/pdf/`;
      }
      return '';
    };

    // 1. arXiv — best: no CORS, no X-Frame-Options, fully embeddable
    for (const url of allUrls) {
      const arxivPdf = getArxivPdfUrl(url);
      if (arxivPdf) return arxivPdf;
    }
    // Also check DOI for arXiv (some papers store DOI as arxiv.org)
    if (paper?.doi) {
      const arxivPdf = getArxivPdfUrl(paper.doi);
      if (arxivPdf) return arxivPdf;
    }

    // 2. NIH PubMed Central PDF (allows iframe; unlike EuropePMC which blocks it)
    for (const url of allUrls) {
      const nihPdf = getNihPmcPdfUrl(url);
      if (nihPdf) return nihPdf;
    }

    // 3. Any direct PDF URL that is NOT EuropePMC ptpmcrender (blocks iframes)
    for (const url of allUrls) {
      const lower = url.toLowerCase();
      const isEpmcStream = lower.includes('ptpmcrender.fcgi') || lower.includes('europepmc.org/backend');
      if (isEpmcStream) continue; // skip — blocked by X-Frame-Options
      if (
        lower.endsWith('.pdf') ||
        lower.includes('format=pdf') ||
        lower.includes('?pdf=render') ||
        lower.includes('.full.pdf') ||
        (lower.includes('/pmc/articles/') && lower.includes('/pdf'))
      ) {
        return url;
      }
    }

    // 4. openAccessUrl if it's a direct stream (last resort — may or may not embed)
    if (paper?.openAccessUrl) {
      const oa = paper.openAccessUrl.trim();
      const lower = oa.toLowerCase();
      const isEpmcStream = lower.includes('ptpmcrender.fcgi') || lower.includes('europepmc.org/backend');
      if (!isEpmcStream && (lower.includes('/pdf') || lower.endsWith('.pdf'))) {
        return oa;
      }
    }

    return '';
  }, [paper?.openAccessUrl, paper?.canonicalUrl, paper?.doi]);

  /**
   * Best URL to open in new tab / external browser.
   *
   * Priority — PDF first, then stable landing page as fallback:
   *   1. arXiv PDF  (arxiv.org/pdf/xxx.pdf)  — direct, always works
   *   2. NIH PMC PDF (ncbi.nlm.nih.gov/pmc/articles/PMCxxx/pdf/)
   *   3. Any other direct .pdf URL
   *   4. openAccessUrl (if it looks like a PDF stream)
   *   5. arXiv abstract page (good landing for arXiv papers)
   *   6. DOI page (publisher landing, canonical fallback)
   *   7. NIH PMC article page
   *   8. canonicalUrl / openAccessUrl
   */
  const bestOpenUrl = useMemo(() => {
    const allUrls = [paper?.openAccessUrl || '', paper?.canonicalUrl || ''].filter(Boolean);

    // 1. arXiv PDF — most reliable direct PDF link
    for (const url of allUrls) {
      const absMatch = url.match(/arxiv\.org\/abs\/(\S+)/i);
      if (absMatch) return `https://arxiv.org/pdf/${absMatch[1].replace(/\.pdf$/i, '')}.pdf`;
      const pdfMatch = url.match(/arxiv\.org\/pdf\/(\S+)/i);
      if (pdfMatch) return url.endsWith('.pdf') ? url : `${url}.pdf`;
    }
    if (paper?.doi) {
      const doiArxiv = paper.doi.match(/arxiv\.org\/abs\/(\S+)/i);
      if (doiArxiv) return `https://arxiv.org/pdf/${doiArxiv[1].replace(/\.pdf$/i, '')}.pdf`;
    }

    // 2. NIH PMC PDF
    for (const url of allUrls) {
      const pmcMatch = url.match(/PMC(\d+)/i);
      if (pmcMatch) return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcMatch[1]}/pdf/`;
    }

    // 3. Any other direct PDF URL
    for (const url of allUrls) {
      const lower = url.toLowerCase();
      if (
        lower.endsWith('.pdf') ||
        lower.includes('format=pdf') ||
        lower.includes('blobtype=pdf') ||
        lower.includes('.full.pdf') ||
        lower.includes('ptpmcrender.fcgi')
      ) {
        return url;
      }
    }

    // 4. openAccessUrl if it seems like a PDF stream
    if (paper?.openAccessUrl) {
      const lower = paper.openAccessUrl.toLowerCase();
      if (lower.includes('/pdf')) return paper.openAccessUrl;
    }

    // 5–8. No direct PDF — fall back to stable landing pages
    // arXiv abstract page
    for (const url of allUrls) {
      if (url.includes('arxiv.org')) return url.includes('/abs/') ? url : url.replace('/pdf/', '/abs/').replace(/\.pdf$/i, '');
    }
    // DOI — resolves to publisher page
    if (paper?.doi) return `https://doi.org/${paper.doi}`;
    // NIH PMC article page
    for (const url of allUrls) {
      const pmcMatch = url.match(/PMC(\d+)/i);
      if (pmcMatch) return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcMatch[1]}/`;
    }
    return paper?.canonicalUrl || paper?.openAccessUrl || '';
  }, [paper?.openAccessUrl, paper?.canonicalUrl, paper?.doi]);

  // Background auto-resolver for Open Access PDFs when DOI is present
  useEffect(() => {
    if (!paper?.doi || resolvedPdfUrl) return;
    let isMounted = true;
    fetchDirectOpenAccessPdf(paper.doi)
      .then((oaPdf) => {
        if (oaPdf && isMounted) {
          setPaper((prev) => (prev ? { ...prev, openAccessUrl: oaPdf, isOpenAccess: true } : prev));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [paper?.doi, resolvedPdfUrl]);

  const isDirectPdf = Boolean(resolvedPdfUrl);
  // Only arXiv PDFs can be reliably embedded via iframe (they don't set X-Frame-Options).
  // PMC, EuropePMC, Springer, Nature, etc. all block iframe embedding — we detect this
  // upfront and show a clean card UI instead of a broken browser error page.
  const isArxivPdf = isDirectPdf && resolvedPdfUrl.includes('arxiv.org');

  const handleOpenPdfBrowser = async () => {
    // bestOpenUrl: direct PDF if available, stable landing page otherwise
    const targetUrl = bestOpenUrl || paper?.canonicalUrl || (paper?.doi ? `https://doi.org/${paper.doi}` : '');
    if (!targetUrl) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(targetUrl);
    } catch {
      Linking.openURL(targetUrl);
    }
  };

  const handleOpenPublisher = async () => {
    const pubUrl = paper?.canonicalUrl || (paper?.doi ? `https://doi.org/${paper.doi}` : '') || paper?.openAccessUrl;
    if (!pubUrl) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(pubUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(pubUrl);
    } catch {
      Linking.openURL(pubUrl);
    }
  };

  // Unified Discussion Creation Handler
  const handleCreateDiscussion = async ({
    type,
    title,
    content,
  }: {
    type: DiscussionType;
    title?: string;
    content: string;
  }) => {
    if (!content.trim() || isSubmittingComment || !paper) return;

    setIsSubmittingComment(true);
    try {
      if (activePostId) {
        let finalContent = content.trim();
        if (title && title.trim()) {
          finalContent = `${title.trim()}\n\n${finalContent}`;
        }
        if (type !== 'discussion') {
          finalContent = `[${type}] ${finalContent}`;
        }
        await addPostComment(activePostId, finalContent, undefined, currentUser?.id);
      } else {
        addDiscussion({
          paperId: paper.id,
          author: currentUser,
          type,
          title: title?.trim() || undefined,
          content: content.trim(),
        });
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (err) {
      console.warn('[PaperDetail] Error adding discussion:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddReplyToDiscussion = async (parentId: string, replyText: string) => {
    if (!replyText.trim() || !paper) return;
    try {
      if (activePostId) {
        await addPostComment(activePostId, replyText.trim(), parentId, currentUser?.id);
      } else {
        addReply({
          paperId: paper.id,
          discussionId: parentId,
          author: currentUser,
          content: replyText.trim(),
        });
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (err) {
      console.warn('[PaperDetail] Error adding reply:', err);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activePostId) return;
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this discussion?');
      if (confirmed) {
        deletePostComment(commentId, activePostId, currentUser?.id);
      }
    } else {
      Alert.alert('Delete Discussion', 'Are you sure you want to delete this contribution?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePostComment(commentId, activePostId, currentUser?.id),
        },
      ]);
    }
  };

  // Total discussions and replies count
  const totalCommentsCount = useMemo(() => {
    if (activePostId) {
      const countAll = (list: Comment[]): number => {
        let total = 0;
        for (const item of list) {
          total += 1;
          if (item.replies && item.replies.length > 0) {
            total += countAll(item.replies);
          }
        }
        return total;
      };
      return countAll(postComments);
    } else {
      let total = 0;
      for (const disc of discussions) {
        total += 1;
        if (disc.replies && disc.replies.length > 0) {
          total += disc.replies.length;
        }
      }
      return total;
    }
  }, [activePostId, postComments, discussions]);

  // Filter counts calculation including recursive nested replies
  const filterCounts = useMemo(() => {
    const counts = {
      all: totalCommentsCount,
      discussion: 0,
      question: 0,
      insight: 0,
      methodology: 0,
    };

    if (activePostId) {
      const countTree = (list: Comment[]) => {
        list.forEach((c) => {
          const textLower = c.content.toLowerCase();
          if (textLower.startsWith('[question]') || textLower.includes('?')) {
            counts.question += 1;
          } else if (textLower.startsWith('[insight]') || textLower.includes('hypothesis') || textLower.includes('insight')) {
            counts.insight += 1;
          } else if (textLower.startsWith('[methodology]') || textLower.includes('protocol') || textLower.includes('method')) {
            counts.methodology += 1;
          } else {
            counts.discussion += 1;
          }
          if (c.replies && c.replies.length > 0) {
            countTree(c.replies);
          }
        });
      };
      countTree(postComments);
    } else {
      discussions.forEach((d) => {
        if (counts[d.type] !== undefined) {
          counts[d.type] += 1;
        } else {
          counts.discussion += 1;
        }
        if (d.replies && d.replies.length > 0) {
          counts.discussion += d.replies.length;
        }
      });
    }
    return counts;
  }, [activePostId, postComments, discussions, totalCommentsCount]);

  // Filtered discussions/comments
  const filteredPostComments = useMemo(() => {
    if (activeFilter === 'all') return postComments;
    return postComments.filter((c) => {
      const textLower = c.content.toLowerCase();
      if (activeFilter === 'question') {
        return textLower.startsWith('[question]') || textLower.includes('?');
      }
      if (activeFilter === 'insight') {
        return textLower.startsWith('[insight]') || textLower.includes('hypothesis') || textLower.includes('insight');
      }
      if (activeFilter === 'methodology') {
        return textLower.startsWith('[methodology]') || textLower.includes('protocol') || textLower.includes('method');
      }
      return !textLower.startsWith('[question]') && !textLower.startsWith('[insight]') && !textLower.startsWith('[methodology]') && !textLower.includes('?');
    });
  }, [postComments, activeFilter]);

  const filteredDiscussions = useMemo(() => {
    if (activeFilter === 'all') return discussions;
    return discussions.filter((d) => d.type === activeFilter);
  }, [discussions, activeFilter]);

  const getJournalVariant = (journal: string): 'nature' | 'science' | 'cell' | 'generic' => {
    const j = journal.toLowerCase();
    if (j.includes('nature')) return 'nature';
    if (j.includes('science')) return 'science';
    if (j.includes('cell')) return 'cell';
    return 'generic';
  };

  // Participating researchers for this paper
  const participatingResearchers = useMemo(() => {
    return getParticipatingResearchers(paperId);
  }, [paperId, getParticipatingResearchers, discussionsMap]);

  // People interested in this paper
  const interestedPeople = useMemo(() => {
    if (!paper) return [];
    return getInterestedPeople(paper, currentUser?.id);
  }, [paper, currentUser?.id, getInterestedPeople]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader showBack title="Research Article" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" color={colors.textSecondary}>
            Loading article details...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!paper) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader showBack title="Research Article" />
        <EmptyState
          icon="FileText"
          title="Paper not found"
          description="The requested research reference could not be located in the repository."
          actionTitle="Back to Feed"
          onAction={() => router.push('/(tabs)')}
        />
      </SafeAreaView>
    );
  }

  const authorsString = paper.authors.map((a) => a.name).join(', ');
  const hasOpenAccessPdf = Boolean(paper.openAccessUrl || paper.canonicalUrl || paper.isOpenAccess);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top Header */}
        <AppHeader
          showBack
          title="Research Article"
          rightAction={
            <View style={styles.headerRightActions}>
              <IconButton
                icon="Bookmark"
                size="sm"
                variant={paper.isSaved ? 'filled' : 'ghost'}
                color={paper.isSaved ? colors.black : colors.textPrimary}
                onPress={handleSave}
              />
              <IconButton
                icon="Share2"
                size="sm"
                variant="ghost"
                color={colors.textPrimary}
                onPress={handleShare}
              />
            </View>
          }
        />

        {/* View Mode Switcher: Article (Substack) vs PDF Document */}
        {hasOpenAccessPdf && (
          <View style={styles.viewModeSwitcherContainer}>
            <View style={styles.viewModeSwitcher}>
              <TouchableOpacity
                onPress={() => setViewMode('article')}
                style={[
                  styles.viewModeTab,
                  viewMode === 'article' && styles.viewModeTabActive,
                ]}
                activeOpacity={0.8}
              >
                <BookOpen
                  size={15}
                  color={viewMode === 'article' ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.viewModeTabText,
                    viewMode === 'article' && styles.viewModeTabTextActive,
                  ]}
                >
                  Article View
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewMode('pdf')}
                style={[
                  styles.viewModeTab,
                  viewMode === 'pdf' && styles.viewModeTabActive,
                ]}
                activeOpacity={0.8}
              >
                <FileText
                  size={15}
                  color={viewMode === 'pdf' ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.viewModeTabText,
                    viewMode === 'pdf' && styles.viewModeTabTextActive,
                  ]}
                >
                  {isDirectPdf ? 'Original PDF' : 'Publisher Portal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
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
          {/* ==================================================================== */}
          {/* VIEW MODE 1: ORIGINAL OPEN ACCESS PDF DOCUMENT / PUBLISHER PORTAL    */}
          {/* ==================================================================== */}
          {viewMode === 'pdf' && hasOpenAccessPdf ? (
            <View style={styles.pdfViewWrapper}>
              <InAppPaperPdfViewer
                paper={paper}
                pdfUrl={resolvedPdfUrl || bestOpenUrl || paper.openAccessUrl || paper.canonicalUrl || ''}
                isDirectPdf={Boolean(resolvedPdfUrl || bestOpenUrl || paper.openAccessUrl)}
                isArxivPdf={isArxivPdf || (paper.doi ? paper.doi.includes('arxiv') : false) || Boolean(bestOpenUrl && bestOpenUrl.includes('arxiv.org'))}
                onSwitchToArticleView={() => setViewMode('article')}
                onRatingUpdated={(newMetrics) => setPaperMetrics(newMetrics)}
              />
            </View>
          ) : (
            /* ==================================================================== */
            /* VIEW MODE 2: SUBSTACK-STYLE ARTICLE FORMAT                          */
            /* ==================================================================== */
            <View style={styles.articleBody}>
              {/* Publication Pill & Date Bar */}
              <View style={styles.editorialMetaRow}>
                <Badge
                  label={paper.journal}
                  variant={getJournalVariant(paper.journal)}
                />
                {paper.isOpenAccess && <Badge label="Open Access" variant="oa" />}

                {/* BOOFFIN HYPE SCORE BADGE */}
                <HypeScoreBadge
                  score={paperMetrics?.hypeScore || 82}
                  metrics={paperMetrics || undefined}
                />

                <Text style={styles.editorialDateText}>
                  {paper.publicationDate || `${paper.publicationYear}`} · 8 min read
                </Text>
              </View>

              {/* Substack Article Headline (Georgia Serif) */}
              <Text style={styles.editorialHeadline}>{paper.title}</Text>

              {/* Author Byline Section */}
              <View style={styles.bylineCard}>
                <View style={styles.bylineHeader}>
                  <Text style={styles.bylineAuthorsLabel}>By {authorsString}</Text>
                </View>
                {paper.doi && (
                  <View style={styles.doiRow}>
                    <Text style={styles.doiLabel}>DOI: {paper.doi}</Text>
                  </View>
                )}
              </View>

              {/* Real-Time Live Readers Velocity */}
              {paperMetrics && (
                <View style={styles.liveVelocityRow}>
                  <Flame size={13} color="#D97706" />
                  <Text style={styles.liveVelocityText}>
                    {paperMetrics.views.toLocaleString()} readers · ↑ {paperMetrics.viewsLast24h} today
                  </Text>
                </View>
              )}

              {/* Substack-Style Abstract Callout Box */}
              {paper.abstract && (
                <View style={styles.substackCalloutBox}>
                  <View style={styles.calloutHeaderRow}>
                    <View style={styles.calloutAccentBar} />
                    <Text style={styles.calloutHeaderTitle}>ABSTRACT & KEY FINDINGS</Text>
                  </View>
                  <Text style={styles.substackAbstractText}>{paper.abstract}</Text>
                </View>
              )}

              {/* High-Resolution Scientific Figures Gallery (if available) */}
              {((paper.figures && paper.figures.length > 0) || (resolvedFigures && resolvedFigures.length > 0)) && (
                <View style={styles.figuresSection}>
                  <Text style={styles.sectionHeaderTitle}>FIGURES & SCHEMATICS</Text>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.figuresScroll}
                  >
                    {(paper.figures && paper.figures.length > 0 ? paper.figures : resolvedFigures).map((fig) => (
                      <View key={fig.id} style={styles.figureSlide}>
                        <Image
                          source={{ uri: fig.url }}
                          style={styles.figureImage}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="disk"
                          priority="high"
                        />
                        {fig.caption && (
                          <Typography
                            variant="micro"
                            color={colors.textSecondary}
                            style={styles.figureCaption}
                          >
                            {fig.caption}
                          </Typography>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Topics Tags */}
              {Array.isArray(paper.topics) && paper.topics.length > 0 && (
                <View style={styles.topicsSection}>
                  <Text style={styles.sectionHeaderTitle}>DISCIPLINES & TOPICS</Text>
                  <View style={styles.topicPillsWrap}>
                    {paper.topics.map((t) => (
                      <TopicChip
                        key={t}
                        label={t}
                        size="sm"
                        onPress={() =>
                          router.push({
                            pathname: '/topic/[slug]',
                            params: { slug: t.toLowerCase() },
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Canonical Publisher External CTA */}
              <TouchableOpacity
                onPress={handleOpenPublisher}
                style={styles.publisherCtaCard}
                activeOpacity={0.88}
              >
                <View style={styles.publisherCtaLeft}>
                  <Globe size={20} color={colors.white} />
                  <View style={styles.publisherCtaTexts}>
                    <Text style={styles.publisherCtaTitle}>
                      Read Original on {paper.journal || 'Publisher'}
                    </Text>
                    <Text style={styles.publisherCtaUrl} numberOfLines={1}>
                      {paper.canonicalUrl || 'Canonical repository reference'}
                    </Text>
                  </View>
                </View>
                <ArrowRight size={18} color={colors.white} />
              </TouchableOpacity>

              {/* Interaction Bar (Like, Citations, Share) */}
              <View style={styles.interactionBar}>
                <LikeButton
                  isLiked={Boolean(paper.isLiked)}
                  likesCount={paper.likesCount}
                  onPress={handleLike}
                  size={18}
                  style={styles.interactionItem}
                />

                <View style={styles.interactionItem}>
                  <DiscussionIcon size={18} color={colors.textSecondary} />
                  <Typography variant="captionMedium" color={colors.textSecondary}>
                    {totalCommentsCount} Discussions
                  </Typography>
                </View>

                <View style={styles.interactionItem}>
                  <TrendingUp size={18} color={colors.textSecondary} />
                  <Typography variant="captionMedium" color={colors.textSecondary}>
                    {paper.citationCount || 18} Citations
                  </Typography>
                </View>

                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.interactionItem}
                  activeOpacity={0.7}
                >
                  <Share2 size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 3-Pill Live HYPE Rating Dock for Article Reader */}
              <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
                <FloatingRatingDock
                  paperId={paper.id}
                  paperTitle={paper.title}
                  onRatingUpdated={(newMetrics) => setPaperMetrics(newMetrics)}
                />
              </View>
            </View>
          )}

          {/* ==================================================================== */}
          {/* PARTICIPATING RESEARCHERS BANNER                                    */}
          {/* ==================================================================== */}
          <ParticipatingResearchers researchers={participatingResearchers} />

          {/* ==================================================================== */}
          {/* UNIFIED SYNCHRONIZED DISCUSSION SECTION                             */}
          {/* ==================================================================== */}
          <View style={styles.discussionSectionWrapper}>
            <View style={styles.discussionHeader}>
              <View style={styles.discussionTitleRow}>
                <DiscussionIcon size={20} color={colors.textPrimary} />
                <Text style={styles.discussionTitle}>Discussion</Text>
                <View style={styles.discussionCountBadge}>
                  <Text style={styles.discussionCountBadgeText}>
                    {totalCommentsCount}
                  </Text>
                </View>
              </View>
              <Text style={styles.discussionSubtitleText}>
                Constructive scientific inquiry & insights
              </Text>
            </View>

            {/* Discussion Type Filter Pills */}
            <DiscussionTypePills
              activeType={activeFilter}
              counts={filterCounts}
              onSelectType={setActiveFilter}
            />

            {/* Discussion Composer Card */}
            <View style={styles.composerWrapper}>
              <DiscussionComposer
                currentUser={currentUser}
                onSubmit={handleCreateDiscussion}
                isSubmitting={isSubmittingComment}
              />
            </View>

            {/* Threaded Discussions List */}
            {activePostId ? (
              /* Synchronized with Post Feed Comments */
              <View style={styles.commentsList}>
                {filteredPostComments.length > 0 ? (
                  filteredPostComments.map((c) => (
                    <CommentCard
                      key={c.id}
                      comment={c}
                      onAddReply={handleAddReplyToDiscussion}
                      onLike={(cId) => toggleLikeComment(cId, activePostId, currentUser?.id)}
                      onLikeReply={(_, replyId) => toggleLikeComment(replyId, activePostId, currentUser?.id)}
                      onDelete={handleDeleteComment}
                      currentUserId={currentUser?.id}
                      currentUser={currentUser}
                    />
                  ))
                ) : (
                  <View style={styles.emptyDiscussionWrap}>
                    <EmptyState
                      icon="Discussion"
                      title="No discussions yet"
                      description="Start a constructive scientific discussion on this paper reference."
                    />
                  </View>
                )}
              </View>
            ) : (
              /* Paper-Level Discussions Fallback */
              <View style={styles.commentsList}>
                {filteredDiscussions.length > 0 ? (
                  filteredDiscussions.map((disc) => (
                    <DiscussionCard
                      key={disc.id}
                      discussion={disc}
                      currentUser={currentUser}
                      onLike={() => toggleLikeDiscussion(paper.id, disc.id, currentUser?.id)}
                      onLikeReply={(_, replyId) =>
                        toggleLikeReply(paper.id, disc.id, replyId, currentUser?.id)
                      }
                      onAddReply={(_, replyContent) =>
                        addReply({
                          paperId: paper.id,
                          discussionId: disc.id,
                          author: currentUser,
                          content: replyContent,
                        })
                      }
                    />
                  ))
                ) : (
                  <View style={styles.emptyDiscussionWrap}>
                    <EmptyState
                      icon="Discussion"
                      title="No discussions yet"
                      description="Start a constructive scientific discussion on this paper reference."
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* People Interested Recommendations */}
          <PeopleInterestedSection people={interestedPeople} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  liveVelocityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  liveVelocityText: {
    ...typography.microBold,
    color: '#92400E',
    fontSize: 11.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl * 2,
  },
  viewModeSwitcherContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    padding: 3,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
  },
  viewModeTabActive: {
    backgroundColor: colors.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  viewModeTabText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  viewModeTabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  pdfViewWrapper: {
    padding: spacing.md,
  },
  pdfControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  pdfControlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  pdfControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  zoomControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 2,
    paddingVertical: 2,
    marginRight: 2,
  },
  zoomBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  zoomResetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zoomResetText: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 11,
  },
  pdfControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pdfControlBtnText: {
    ...typography.micro,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  webPdfContainer: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pdfNotLoadingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFBEB',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    flexWrap: 'wrap',
  },
  pdfNotLoadingText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
  },
  pdfNotLoadingLink: {
    ...typography.micro,
    color: colors.accentLink,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  pdfFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pdfFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfFooterText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  pdfFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pdfFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pdfFooterBtnText: {
    ...typography.microBold,
    color: colors.accentLink,
    fontSize: 11.5,
  },
  pdfFooterBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pdfFooterBtnSecondaryText: {
    ...typography.microBold,
    color: colors.textPrimary,
    fontSize: 11.5,
  },
  webPublisherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.xl + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginVertical: spacing.sm,
  },
  webPublisherIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  webPublisherTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  webPublisherSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
    maxWidth: 520,
    lineHeight: 22,
    fontSize: 14,
  },
  doiPill: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  doiPillText: {
    ...typography.microBold,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  webPublisherActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  openPublisherPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#064E3B', // Brand dark green
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: spacing.md - 2,
    borderRadius: radii.md,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  openPublisherBtnText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '700',
  },
  openArticleSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: spacing.md - 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  openArticleSecondaryBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  mobilePdfCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.md,
  },
  mobilePdfIconWrap: {
    width: 68,
    height: 68,
    borderRadius: radii.full,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  mobilePdfTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  mobilePdfSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  openPdfPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  openPdfBtnText: {
    ...typography.captionBold,
    color: colors.white,
  },
  articleBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  editorialMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  editorialDateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  editorialHeadline: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 33,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  bylineCard: {
    marginBottom: spacing.lg,
  },
  bylineHeader: {
    marginBottom: 4,
  },
  bylineAuthorsLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  doiRow: {
    marginTop: 2,
  },
  doiLabel: {
    ...typography.micro,
    color: colors.textMuted,
  },
  substackCalloutBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.sm,
    borderLeftWidth: 3.5,
    borderLeftColor: '#1E293B',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  calloutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  calloutAccentBar: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: '#1E293B',
  },
  calloutHeaderTitle: {
    ...typography.micro,
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  substackAbstractText: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 15.5,
    color: '#1F2937',
    lineHeight: 25,
  },
  figuresSection: {
    marginBottom: spacing.lg,
  },
  sectionHeaderTitle: {
    ...typography.micro,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  figuresScroll: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
  },
  figureSlide: {
    width: 360,
    padding: spacing.sm,
  },
  figureImage: {
    width: '100%',
    height: 190,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundTertiary,
  },
  figureCaption: {
    marginTop: spacing.xs,
  },
  topicsSection: {
    marginBottom: spacing.lg,
  },
  topicPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  publisherCtaCard: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  publisherCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  publisherCtaTexts: {
    flex: 1,
  },
  publisherCtaTitle: {
    ...typography.captionBold,
    color: colors.white,
  },
  publisherCtaUrl: {
    ...typography.micro,
    color: 'rgba(255,255,255,0.75)',
  },
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  discussionSectionWrapper: {
    backgroundColor: colors.background,
  },
  discussionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  discussionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 2,
  },
  discussionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  discussionCountBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  discussionCountBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  discussionSubtitleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  composerWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentsList: {
    marginTop: spacing.xs,
  },
  emptyDiscussionWrap: {
    paddingVertical: spacing.xl,
  },
  publisherProtectedIconRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  publisherProtectedIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  publisherProtectedInfoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  publisherProtectedInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  publisherProtectedInfoText: {
    ...typography.micro,
    color: '#0F4C81',
    fontWeight: '600',
    fontSize: 11,
  },
});
