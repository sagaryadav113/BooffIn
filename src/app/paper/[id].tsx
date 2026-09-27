import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import {
  ExternalLink,
  ArrowRight,
  Heart,
  MessageSquare,
  TrendingUp,
  Bookmark,
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
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Badge } from '../../components/core/Badge';
import { TopicChip } from '../../components/core/TopicChip';
import { IconButton } from '../../components/core/IconButton';
import { Typography } from '../../components/core/Typography';
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

export default function PaperDetailScreen() {
  const { id, fromPostId } = useLocalSearchParams<{ id: string; fromPostId?: string }>();
  const paperId = id || '';
  const activePostId = fromPostId || '';

  const getPaperById = usePaperStore((s) => s.getPaperById);
  const fetchPaperById = usePaperStore((s) => s.fetchPaperById);
  const toggleSavePaper = usePaperStore((s) => s.toggleSavePaper);
  const toggleLikePaper = usePaperStore((s) => s.toggleLikePaper);
  const currentUser = useAuthStore((s) => s.user);

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

  // Derive initial paper object from local state or post
  const initialPaper = useMemo(() => {
    let p = getPaperById(paperId);
    if (!p && activePostId) {
      p = usePostStore.getState().getPostById(activePostId)?.paper || undefined;
    }
    if (!p) {
      const match = usePostStore.getState().posts.find(
        (item) => item.paper && (item.paper.id === paperId || item.paper.doi === paperId)
      );
      if (match?.paper) p = match.paper;
    }
    return p || null;
  }, [paperId, activePostId, getPaperById]);

  const [paper, setPaper] = useState<Paper | null>(initialPaper);
  const resolvedFigures = usePaperFigures(paper);
  const [isLoading, setIsLoading] = useState(!initialPaper);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reader View Mode: 'article' (Substack format) vs 'pdf' (Open Access Document)
  const [viewMode, setViewMode] = useState<'article' | 'pdf'>('article');

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
    if (!paperId) {
      setIsLoading(false);
      return;
    }

    // Try finding paper in paperStore or postStore first
    let currentPaper = getPaperById(paperId);
    if (!currentPaper && activePostId) {
      currentPaper = usePostStore.getState().getPostById(activePostId)?.paper || undefined;
    }
    if (!currentPaper) {
      const matchingPost = usePostStore.getState().posts.find(
        (p) => p.paper && (p.paper.id === paperId || p.paper.doi === paperId)
      );
      if (matchingPost?.paper) {
        currentPaper = matchingPost.paper;
      }
    }

    if (currentPaper) {
      setPaper(currentPaper);
      setIsLoading(false);
    } else if (!isRefresh) {
      setIsLoading(true);
    }

    try {
      const fetched = await fetchPaperById(paperId);
      if (fetched) {
        setPaper(fetched);
      }
    } catch (e) {}

    try {
      if (activePostId) {
        await fetchCommentsForPost(activePostId, currentUser?.id);
      } else {
        await fetchDiscussionsForPaper(paperId);
      }
    } catch (e) {}

    setIsLoading(false);
    if (isRefresh) setIsRefreshing(false);
  }, [paperId, activePostId, currentUser?.id, getPaperById, fetchPaperById, fetchCommentsForPost, fetchDiscussionsForPaper]);

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

  const handleOpenPublisher = () => {
    if (paper?.canonicalUrl) {
      Linking.openURL(paper.canonicalUrl);
    }
  };

  const handleOpenPdfBrowser = async () => {
    const pdfUrl = paper?.openAccessUrl || paper?.canonicalUrl;
    if (!pdfUrl) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(pdfUrl);
    } catch {
      Linking.openURL(pdfUrl);
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

  // Filter counts calculation
  const filterCounts = useMemo(() => {
    const counts = {
      all: activePostId ? postComments.length : discussions.length,
      discussion: 0,
      question: 0,
      insight: 0,
      methodology: 0,
    };

    if (activePostId) {
      postComments.forEach((c) => {
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
      });
    } else {
      discussions.forEach((d) => {
        if (counts[d.type] !== undefined) {
          counts[d.type] += 1;
        } else {
          counts.discussion += 1;
        }
      });
    }
    return counts;
  }, [activePostId, postComments, discussions]);

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
      <SafeAreaView style={styles.safeArea}>
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
      <SafeAreaView style={styles.safeArea}>
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
  const totalCommentsCount = activePostId ? postComments.length : discussions.length;
  const hasOpenAccessPdf = Boolean(paper.isOpenAccess && paper.openAccessUrl);

  return (
    <SafeAreaView style={styles.safeArea}>
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
                  Original PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
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
          {/* VIEW MODE 1: ORIGINAL OPEN ACCESS PDF DOCUMENT                      */}
          {/* ==================================================================== */}
          {viewMode === 'pdf' && hasOpenAccessPdf ? (
            <View style={styles.pdfViewWrapper}>
              {/* Clean Light-Themed Reader Floating Bar with Zoom Controls */}
              <View style={styles.pdfControlsBar}>
                <View style={styles.pdfControlsLeft}>
                  <Badge label={paper.journal || 'Open Access'} variant="oa" />
                  <Typography variant="micro" color={colors.textSecondary} numberOfLines={1}>
                    Full Document
                  </Typography>
                </View>

                <View style={styles.pdfControlsRight}>
                  {/* Interactive Pinch/Tap Zoom Controls */}
                  <View style={styles.zoomControlGroup}>
                    <TouchableOpacity
                      onPress={handleZoomOut}
                      disabled={pdfZoom <= 0.75}
                      style={[styles.zoomBtn, pdfZoom <= 0.75 && styles.zoomBtnDisabled]}
                      activeOpacity={0.7}
                      accessibilityLabel="Zoom out"
                    >
                      <ZoomOut size={12} color={pdfZoom <= 0.75 ? colors.textMuted : colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleResetZoom}
                      style={styles.zoomResetBtn}
                      activeOpacity={0.7}
                      accessibilityLabel="Reset zoom to 100%"
                    >
                      <Text style={styles.zoomResetText}>{Math.round(pdfZoom * 100)}%</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleZoomIn}
                      disabled={pdfZoom >= 2.5}
                      style={[styles.zoomBtn, pdfZoom >= 2.5 && styles.zoomBtnDisabled]}
                      activeOpacity={0.7}
                      accessibilityLabel="Zoom in"
                    >
                      <ZoomIn size={12} color={pdfZoom >= 2.5 ? colors.textMuted : colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleOpenPdfBrowser}
                    style={styles.pdfControlBtn}
                    activeOpacity={0.75}
                  >
                    <Maximize2 size={13} color={colors.textPrimary} />
                    <Text style={styles.pdfControlBtnText}>Fullscreen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleOpenPublisher}
                    style={styles.pdfControlBtn}
                    activeOpacity={0.75}
                  >
                    <ExternalLink size={13} color={colors.textPrimary} />
                    <Text style={styles.pdfControlBtnText}>Publisher</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {Platform.OS === 'web' ? (
                <View style={styles.webPdfContainer}>
                  {/* @ts-ignore Direct Native PDF Iframe */}
                  <iframe
                    src={`${paper.openAccessUrl || paper.canonicalUrl}`}
                    style={{
                      width: '100%',
                      height: 780,
                      border: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                    title={paper.title}
                    allow="fullscreen"
                  />
                </View>
              ) : (
                <View style={styles.mobilePdfCard}>
                  <View style={styles.mobilePdfIconWrap}>
                    <FileCheck size={36} color={colors.accentLink} />
                  </View>
                  <Typography variant="h4" style={styles.mobilePdfTitle}>
                    Open Access Document Ready
                  </Typography>
                  <Typography
                    variant="caption"
                    color={colors.textSecondary}
                    style={styles.mobilePdfSubtitle}
                  >
                    Read the full original publication PDF in high fidelity.
                  </Typography>
                  <TouchableOpacity
                    onPress={handleOpenPdfBrowser}
                    style={styles.openPdfPrimaryBtn}
                    activeOpacity={0.85}
                  >
                    <BookOpen size={18} color={colors.white} />
                    <Text style={styles.openPdfBtnText}>Open Full PDF in In-App Reader</Text>
                  </TouchableOpacity>
                </View>
              )}
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
                <TouchableOpacity
                  onPress={handleLike}
                  style={styles.interactionItem}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={18}
                    color={paper.isLiked ? colors.accentRed : colors.textSecondary}
                    fill={paper.isLiked ? colors.accentRed : 'transparent'}
                  />
                  <Typography
                    variant="captionMedium"
                    color={paper.isLiked ? colors.accentRed : colors.textSecondary}
                  >
                    {paper.likesCount}
                  </Typography>
                </TouchableOpacity>

                <View style={styles.interactionItem}>
                  <MessageSquare size={18} color={colors.textSecondary} />
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
                <MessageSquare size={20} color={colors.textPrimary} />
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
                      icon="MessageSquare"
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
                      onLike={() => toggleLikeDiscussion(paper.id, disc.id)}
                      onLikeReply={(_, replyId) =>
                        toggleLikeReply(paper.id, disc.id, replyId)
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
                      icon="MessageSquare"
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
});
