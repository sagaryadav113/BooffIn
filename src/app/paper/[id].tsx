import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ExternalLink,
  ArrowRight,
  Heart,
  MessageSquare,
  TrendingUp,
  Bookmark,
  Share2,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Badge } from '../../components/core/Badge';
import { TopicChip } from '../../components/core/TopicChip';
import { IconButton } from '../../components/core/IconButton';
import { Typography } from '../../components/core/Typography';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePaperStore } from '../../store/usePaperStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useDiscussionStore } from '../../store/useDiscussionStore';
import {
  DiscussionTypePills,
  DiscussionComposer,
  DiscussionCard,
  ParticipatingResearchers,
  PeopleInterestedSection,
} from '../../components/discussion';
import { currentUser as fallbackUser } from '../../data/mockData';
import { DiscussionType } from '../../types';

export default function PaperDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paperId = id || 'paper_1';

  const getPaperById = usePaperStore((s) => s.getPaperById);
  const toggleSavePaper = usePaperStore((s) => s.toggleSavePaper);
  const toggleLikePaper = usePaperStore((s) => s.toggleLikePaper);
  const authUser = useAuthStore((s) => s.user);
  const currentUser = authUser || fallbackUser;

  // Discussion store hooks
  const discussions = useDiscussionStore((s) => s.discussions[paperId] || []);
  const activeFilter = useDiscussionStore((s) => s.activeFilter);
  const setActiveFilter = useDiscussionStore((s) => s.setActiveFilter);
  const addDiscussion = useDiscussionStore((s) => s.addDiscussion);
  const addReply = useDiscussionStore((s) => s.addReply);
  const toggleLikeDiscussion = useDiscussionStore((s) => s.toggleLikeDiscussion);
  const toggleLikeReply = useDiscussionStore((s) => s.toggleLikeReply);
  const getParticipatingResearchers = useDiscussionStore((s) => s.getParticipatingResearchers);
  const getInterestedPeople = useDiscussionStore((s) => s.getInterestedPeople);

  const [abstractExpanded, setAbstractExpanded] = useState(false);

  const paper = getPaperById(paperId);

  // Compute counts for structured discussion types
  const counts = useMemo(() => {
    return {
      all: discussions.length,
      discussion: discussions.filter((d) => d.type === 'discussion').length,
      question: discussions.filter((d) => d.type === 'question').length,
      insight: discussions.filter((d) => d.type === 'insight').length,
      methodology: discussions.filter((d) => d.type === 'methodology').length,
    };
  }, [discussions]);

  // Filtered discussions list
  const filteredDiscussions = useMemo(() => {
    if (activeFilter === 'all') return discussions;
    return discussions.filter((d) => d.type === activeFilter);
  }, [discussions, activeFilter]);

  // Participating researchers for this paper
  const participatingResearchers = useMemo(() => {
    return getParticipatingResearchers(paperId);
  }, [discussions, paperId, getParticipatingResearchers]);

  // People interested in this paper (deterministic recommendations based on topics & interactions)
  const interestedPeople = useMemo(() => {
    if (!paper) return [];
    return getInterestedPeople(paper, currentUser.id);
  }, [paper, currentUser.id, getInterestedPeople]);

  if (!paper) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader showBack title="Paper Reference" />
        <EmptyState
          icon="FileText"
          title="Paper not found"
          description="The requested research reference could not be located."
          actionTitle="Back to Explore"
          onAction={() => router.push('/(tabs)/explore')}
        />
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${paper.title}\n${paper.canonicalUrl}\nDiscussed on BooffIn: Where scientific research finds its people.`,
      });
    } catch {}
  };

  const handleSave = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSavePaper(paper.id, currentUser.id);
  };

  const handleLike = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleLikePaper(paper.id);
  };

  const handleOpenPublisher = () => {
    if (paper.canonicalUrl) {
      Linking.openURL(paper.canonicalUrl);
    }
  };

  const getJournalVariant = (journal: string): 'nature' | 'science' | 'cell' | 'generic' => {
    const j = journal.toLowerCase();
    if (j.includes('nature')) return 'nature';
    if (j.includes('science')) return 'science';
    if (j.includes('cell')) return 'cell';
    return 'generic';
  };

  const handlePostDiscussion = (params: {
    type: DiscussionType;
    content: string;
    title?: string;
  }) => {
    addDiscussion({
      paperId: paper.id,
      author: currentUser,
      type: params.type,
      content: params.content,
      title: params.title,
    });
  };

  const handleAddReply = (discussionId: string, content: string) => {
    addReply({
      paperId: paper.id,
      discussionId,
      author: currentUser,
      content,
    });
  };

  const authorsString = paper.authors.map((a) => a.name).join(', ');
  const totalDiscussionCount = discussions.reduce(
    (acc, d) => acc + 1 + (d.replies?.length || 0),
    0
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        showBack
        title="Paper Reference"
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Figures Gallery Carousel (if available) */}
        {paper.figures && paper.figures.length > 0 && (
          <View style={styles.figuresContainer}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {paper.figures.map((fig) => (
                <View key={fig.id} style={styles.figureSlide}>
                  <Image
                    source={{ uri: fig.url }}
                    style={styles.figureImage}
                    contentFit="cover"
                    transition={200}
                  />
                  {fig.caption && (
                    <Typography variant="micro" color={colors.textSecondary} style={styles.figureCaption}>
                      {fig.caption}
                    </Typography>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ================================================================ */}
        {/* PAPER REFERENCE METADATA CARD */}
        {/* ================================================================ */}
        <View style={styles.metaContainer}>
          {/* Paper Title */}
          <Typography variant="titleSerif" style={styles.title}>
            {paper.title}
          </Typography>

          {/* Journal Badge & Publication Date */}
          <View style={styles.journalRow}>
            <Badge
              label={paper.journal}
              variant={getJournalVariant(paper.journal)}
            />
            {paper.isOpenAccess && <Badge label="Open Access" variant="oa" />}
            <Typography variant="captionMedium" color={colors.textSecondary}>
              {paper.publicationDate ? `${paper.journal} · ${paper.publicationDate}` : `${paper.journal} (${paper.publicationYear})`}
            </Typography>
          </View>

          {/* Authors List */}
          <Typography variant="caption" color={colors.textSecondary} style={styles.authorsText}>
            {authorsString}
          </Typography>

          {/* Canonical External "Read Paper" Button */}
          <TouchableOpacity
            onPress={handleOpenPublisher}
            style={styles.readPaperExternalBtn}
            activeOpacity={0.85}
          >
            <View style={styles.readPaperLeft}>
              <ExternalLink size={18} color={colors.white} />
              <View style={styles.readPaperTextWrap}>
                <Typography variant="captionBold" color={colors.white}>
                  Read Paper on Publisher / Repository
                </Typography>
                <Typography variant="micro" color="rgba(255,255,255,0.8)" numberOfLines={1}>
                  {paper.canonicalUrl}
                </Typography>
              </View>
            </View>
            <ArrowRight size={16} color={colors.white} />
          </TouchableOpacity>

          {/* Abstract Section */}
          {paper.abstract && (
            <View style={styles.abstractSection}>
              <Typography variant="captionBold" color={colors.textPrimary} style={styles.abstractHeading}>
                Abstract
              </Typography>
              <Typography
                variant="body"
                numberOfLines={abstractExpanded ? undefined : 4}
                style={styles.abstractText}
              >
                {paper.abstract}
              </Typography>
              {paper.abstract.length > 150 && (
                <TouchableOpacity
                  onPress={() => setAbstractExpanded(!abstractExpanded)}
                  style={styles.readMoreButton}
                  activeOpacity={0.7}
                >
                  <Typography variant="captionBold" color={colors.textPrimary}>
                    {abstractExpanded ? 'Show less' : 'Read more'}
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Topics & Disciplines */}
          <View style={styles.topicsSection}>
            <Typography variant="captionBold" color={colors.textPrimary} style={styles.topicsHeading}>
              Topics & Disciplines
            </Typography>
            <View style={styles.topicPillsWrap}>
              {paper.topics.map((t) => (
                <TopicChip
                  key={t}
                  label={t}
                  size="sm"
                  onPress={() => router.push({ pathname: '/topic/[slug]', params: { slug: t.toLowerCase() } })}
                />
              ))}
            </View>
          </View>

          {/* Interaction & Metric Bar */}
          <View style={styles.interactionBar}>
            <TouchableOpacity onPress={handleLike} style={styles.interactionItem} activeOpacity={0.7}>
              <Heart
                size={16}
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
              <MessageSquare size={16} color={colors.textSecondary} />
              <Typography variant="captionMedium" color={colors.textSecondary}>
                {totalDiscussionCount} Discussions
              </Typography>
            </View>

            <View style={styles.interactionItem}>
              <TrendingUp size={16} color={colors.textSecondary} />
              <Typography variant="captionMedium" color={colors.textSecondary}>
                {paper.citationCount || 18} Citations
              </Typography>
            </View>

            <TouchableOpacity onPress={handleShare} style={styles.interactionItem} activeOpacity={0.7}>
              <Share2 size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================================================ */}
        {/* PARTICIPATING RESEARCHERS BANNER */}
        {/* ================================================================ */}
        <ParticipatingResearchers researchers={participatingResearchers} />

        {/* ================================================================ */}
        {/* STRUCTURED DISCUSSION SECTION */}
        {/* ================================================================ */}
        <View style={styles.discussionHeader}>
          <View style={styles.discussionTitleRow}>
            <MessageSquare size={18} color={colors.textPrimary} />
            <Typography variant="h4" style={styles.discussionTitle}>
              Discussion
            </Typography>
            <View style={styles.discussionCountBadge}>
              <Typography variant="micro" color={colors.textSecondary} style={{ fontWeight: '700' }}>
                {totalDiscussionCount}
              </Typography>
            </View>
          </View>
          <Typography variant="micro" color={colors.textSecondary}>
            Constructive scientific inquiry & insights
          </Typography>
        </View>

        {/* Discussion Type Filter Tabs */}
        <DiscussionTypePills
          activeType={activeFilter}
          counts={counts}
          onSelectType={setActiveFilter}
        />

        {/* Discussion Contribution Composer */}
        <DiscussionComposer
          currentUser={currentUser}
          onSubmit={handlePostDiscussion}
        />

        {/* Threaded Discussion List */}
        {filteredDiscussions.length > 0 ? (
          <View style={styles.discussionList}>
            {filteredDiscussions.map((disc) => (
              <DiscussionCard
                key={disc.id}
                discussion={disc}
                currentUser={currentUser}
                onLike={() => toggleLikeDiscussion(paper.id, disc.id)}
                onLikeReply={(_, replyId) => toggleLikeReply(paper.id, disc.id, replyId)}
                onAddReply={(_, replyContent) => handleAddReply(disc.id, replyContent)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyDiscussionWrap}>
            <EmptyState
              icon="MessageSquare"
              title={
                activeFilter === 'all'
                  ? 'No discussions yet'
                  : `No ${activeFilter}s yet`
              }
              description="Start the first academic conversation, question, or insight about this paper!"
            />
          </View>
        )}

        {/* ================================================================ */}
        {/* PEOPLE INTERESTED IN THIS SECTION (DETERMINISTIC RECOMMENDATIONS) */}
        {/* ================================================================ */}
        <PeopleInterestedSection people={interestedPeople} />
      </ScrollView>
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
    paddingBottom: spacing.xxxl * 1.5,
  },
  figuresContainer: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  figureSlide: {
    width: 380,
    padding: spacing.md,
  },
  figureImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundTertiary,
  },
  figureCaption: {
    marginTop: spacing.xs,
  },
  metaContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  authorsText: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  readPaperExternalBtn: {
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
  readPaperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  readPaperTextWrap: {
    flex: 1,
  },
  abstractSection: {
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  abstractHeading: {
    marginBottom: spacing.xs,
  },
  abstractText: {
    color: colors.textPrimary,
    lineHeight: 22,
  },
  readMoreButton: {
    marginTop: spacing.sm,
  },
  topicsSection: {
    marginBottom: spacing.lg,
  },
  topicsHeading: {
    marginBottom: spacing.xs + 2,
  },
  topicPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
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
  discussionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs + 2,
    backgroundColor: colors.background,
  },
  discussionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 2,
  },
  discussionTitle: {
    fontSize: 18,
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
  discussionList: {
    marginTop: spacing.xs,
  },
  emptyDiscussionWrap: {
    paddingVertical: spacing.lg,
  },
});
