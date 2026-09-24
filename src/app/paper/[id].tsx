import React, { useState } from 'react';
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
import { colors, radii, spacing } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { Badge } from '../../components/core/Badge';
import { TopicChip } from '../../components/core/TopicChip';
import { IconButton } from '../../components/core/IconButton';
import { Typography } from '../../components/core/Typography';
import { Icon } from '../../components/core/Icon';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PostCard } from '../../components/cards/PostCard';
import { usePaperStore } from '../../store/usePaperStore';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function PaperDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getPaperById = usePaperStore((s) => s.getPaperById);
  const toggleSavePaper = usePaperStore((s) => s.toggleSavePaper);
  const toggleLikePaper = usePaperStore((s) => s.toggleLikePaper);
  const getPostsByPaper = usePostStore((s) => s.getPostsByPaper);
  const currentUser = useAuthStore((s) => s.user);

  const [abstractExpanded, setAbstractExpanded] = useState(false);

  const paper = getPaperById(id || 'paper_1');
  const relatedPosts = paper ? getPostsByPaper(paper.id) : [];

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
        message: `${paper.title}\n${paper.canonicalUrl}\nDiscussed on BooffIn: Research finds it's people.`,
      });
    } catch {}
  };

  const handleSave = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSavePaper(paper.id, currentUser?.id);
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

  const getJournalVariant = (journal: string) => {
    const j = journal.toLowerCase();
    if (j.includes('nature')) return 'nature';
    if (j.includes('science')) return 'science';
    if (j.includes('cell')) return 'cell';
    return 'generic';
  };

  const authorsString = paper.authors.map((a) => a.name).join(', ');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        showBack
        title="Research Reference"
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
        {/* Figures Gallery Carousel */}
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

        {/* Paper Main Metadata */}
        <View style={styles.metaContainer}>
          {/* Title */}
          <Typography variant="titleSerif" style={styles.title}>
            {paper.title}
          </Typography>

          {/* Journal Badge & Publisher Link */}
          <View style={styles.journalRow}>
            <Badge
              label={paper.journal}
              variant={getJournalVariant(paper.journal)}
            />
            <Typography variant="captionMedium" color={colors.textSecondary}>
              {paper.journal} ({paper.publicationYear})
            </Typography>
          </View>

          {/* Authors */}
          <Typography variant="caption" color={colors.textSecondary} style={styles.authorsText}>
            {authorsString}
          </Typography>

          {/* Read Paper External Publisher Action */}
          <TouchableOpacity
            onPress={handleOpenPublisher}
            style={styles.readPaperExternalBtn}
            activeOpacity={0.85}
          >
            <View style={styles.readPaperLeft}>
              <Icon name="ExternalLink" size="sm" color={colors.white} />
              <View>
                <Typography variant="captionBold" color={colors.white}>
                  Read Paper on Publisher / Repository
                </Typography>
                <Typography variant="micro" color="rgba(255,255,255,0.8)" numberOfLines={1}>
                  {paper.canonicalUrl}
                </Typography>
              </View>
            </View>
            <Icon name="ArrowRight" size="xs" color={colors.white} />
          </TouchableOpacity>

          {/* Abstract Section */}
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

          {/* Topic Tags */}
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

          {/* Interaction Bar */}
          <View style={styles.interactionBar}>
            <TouchableOpacity onPress={handleLike} style={styles.interactionItem} activeOpacity={0.7}>
              <Icon
                name="Heart"
                size="sm"
                color={paper.isLiked ? colors.accentRed : colors.textSecondary}
              />
              <Typography
                variant="captionMedium"
                color={paper.isLiked ? colors.accentRed : colors.textSecondary}
              >
                {paper.likesCount}
              </Typography>
            </TouchableOpacity>

            <View style={styles.interactionItem}>
              <Icon name="MessageSquare" size="sm" color={colors.textSecondary} />
              <Typography variant="captionMedium" color={colors.textSecondary}>
                {paper.discussionCount}
              </Typography>
            </View>

            <View style={styles.interactionItem}>
              <Icon name="TrendingUp" size="sm" color={colors.textSecondary} />
              <Typography variant="captionMedium" color={colors.textSecondary}>
                18 Citations
              </Typography>
            </View>

            <IconButton
              icon="Share2"
              size="sm"
              variant="ghost"
              color={colors.textSecondary}
              onPress={handleShare}
            />
          </View>
        </View>

        {/* Community Discussions Header */}
        <View style={styles.discussionsHeader}>
          <Typography variant="captionBold" color={colors.textPrimary}>
            Community Discussions
          </Typography>
          <Typography variant="caption" color={colors.textSecondary}>
            ({relatedPosts.length})
          </Typography>
        </View>

        {/* Related Posts */}
        {relatedPosts.length > 0 ? (
          relatedPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <EmptyState
            icon="MessageSquare"
            title="No discussions yet"
            description="Start the first academic conversation or critique about this paper!"
          />
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
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
  publisherLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
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
  discussionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
});
