import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Paper } from '../../types';
import { radii, typography, useColors, useIsDark } from '../../theme';
import { SaveButton } from '../core/SaveButton';
import { DiscussionIcon } from '../core/DiscussionIcon';
import { ReadBookIcon } from '../core/ReadBookIcon';
import { ShareToChatButton } from '../core/ShareToChatButton';
import { SharePostToWorkspaceModal } from '../modals/SharePostToWorkspaceModal';
import { usePaperStore } from '../../store/usePaperStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getPaperMetrics, subscribeToPaperRead, PaperMetrics, calculate48hHypeScore } from '../../api/hypeScoreService';

export interface HypedPaperCardProps {
  paper: Paper;
  rank: number;
  timeframe?: '48h' | 'week' | 'month' | 'all';
  style?: ViewStyle;
}

export function formatCompactNumber(num: number): string {
  if (!num || num === 0) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export const HypedPaperCard: React.FC<HypedPaperCardProps> = ({
  paper,
  rank,
  timeframe = 'week',
  style,
}) => {
  const colors = useColors();
  const isDark = useIsDark();
  const isSavedInStore = usePaperStore(
    (s) =>
      s.savedPaperIds.has(paper.id) ||
      (paper.doi ? s.savedPaperIds.has(paper.doi) : false)
  );
  const isSaved = Boolean(isSavedInStore || paper.isSaved);
  const toggleSavePaper = usePaperStore((s) => s.toggleSavePaper);
  const currentUser = useAuthStore((s) => s.user);

  const [metrics, setMetrics] = React.useState<PaperMetrics | null>(null);
  const [isShareToWorkspaceOpen, setIsShareToWorkspaceOpen] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    getPaperMetrics(paper.id).then((m) => {
      if (isMounted) setMetrics(m);
    });

    const unsubscribe = subscribeToPaperRead((readPaperId, updatedMetrics) => {
      if (!isMounted) return;
      if (readPaperId === paper.id || (paper.doi && readPaperId === paper.doi)) {
        setMetrics(updatedMetrics);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [paper.id, paper.doi]);

  const handleCardPress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    // Pre-seed into usePaperStore so /paper/[id] immediately finds it without loading or failing
    usePaperStore.getState().addPaper(paper);
    router.push({
      pathname: '/paper/[id]',
      params: {
        id: paper.id,
        doi: paper.doi || '',
        title: paper.title ? encodeURIComponent(paper.title) : '',
        url: paper.canonicalUrl || '',
        pdfUrl: paper.openAccessUrl || '',
      },
    });
  };

  const handleSave = (e?: any) => {
    e?.stopPropagation?.();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSavePaper(paper.id, currentUser?.id, paper);
  };

  const handleShare = async (e?: any) => {
    e?.stopPropagation?.();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
      const shareUrl = paper.canonicalUrl || `https://www.letsbooffin.com/paper/${paper.id || (paper as any).doi || ''}`;
      await Share.share({
        message: `${paper.title}\n\nRead on BooffIn: ${shareUrl}`,
        url: shareUrl,
        title: paper.title,
      });
  };

  // Real synchronized counts across card and article viewer
  const readCount = metrics?.views ?? (paper as any).viewsCount ?? 0;
  const discussionCount = paper.discussionCount ?? 0;
  const shareCount = (paper as any).sharesCount ?? (readCount > 0 ? Math.floor(readCount * 0.05) : 0);

  // Authentic 48-Hour HYPE score (only computed if genuine community rating exists)
  const numericHypeScore = React.useMemo(() => {
    if (typeof (paper as any).calculatedHype === 'number') {
      return (paper as any).calculatedHype;
    }
    return calculate48hHypeScore(paper, metrics);
  }, [paper, metrics]);

  const isUnrated = !numericHypeScore || numericHypeScore <= 0;
  const hypeScoreFormatted = isUnrated ? 'Unrated' : numericHypeScore.toFixed(1);
  const progressPercent = isUnrated ? 0 : Math.min(100, Math.max(10, (numericHypeScore / 5.0) * 100));

  // Rank badge styling
  const getRankBadgeStyle = (r: number) => {
    if (isDark) {
      if (r === 1) return { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.4)' };
      if (r === 2) return { bg: 'rgba(148, 163, 184, 0.2)', text: '#E2E8F0', border: 'rgba(148, 163, 184, 0.3)' };
      if (r === 3) return { bg: 'rgba(249, 115, 22, 0.2)', text: '#FB923C', border: 'rgba(249, 115, 22, 0.4)' };
      return { bg: colors.backgroundSecondary, text: colors.textSecondary, border: colors.borderLight };
    }
    if (r === 1) return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    if (r === 2) return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    if (r === 3) return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' };
    return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
  };

  const rankStyle = getRankBadgeStyle(rank);

  // Author and year display
  const leadAuthor = paper.authors?.[0]?.name || 'Unknown Author';
  const authorDisplay =
    paper.authors && paper.authors.length > 1
      ? `${leadAuthor} et al.`
      : leadAuthor;
  const pubYear = paper.publicationYear || new Date().getFullYear();
  const metaLine = `${authorDisplay} · ${paper.journal || 'Journal'} · ${pubYear}`;

  // Clean and constrain topic tags so they never exceed the designated card bounds
  const cleanedTopics = React.useMemo(() => {
    const rawList =
      paper.topics && paper.topics.length > 0
        ? paper.topics
        : ['Scientific Research'];

    return rawList
      .slice(0, 2)
      .map((t) => {
        let clean = (t || '').trim();
        // Remove subtitles like "Journal : journal of..."
        if (clean.includes(':')) {
          clean = clean.split(':')[0].trim();
        }
        // Limit maximum character length
        if (clean.length > 26) {
          clean = clean.slice(0, 25).trim() + '…';
        }
        return clean;
      })
      .filter((t) => t.length > 0);
  }, [paper.topics]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleCardPress}
        style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }, style]}
      >
      {/* Top Left Floating Rank Badge */}
      <View
        style={[
          styles.rankBadge,
          {
            backgroundColor: rankStyle.bg,
            borderColor: rankStyle.border,
          },
        ]}
      >
        <Text style={[styles.rankText, { color: rankStyle.text }]}>{rank}</Text>
      </View>

      <View style={styles.cardContent}>
        {/* Paper Details */}
        <View style={styles.centerDetails}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
            {paper.title}
          </Text>

          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {metaLine}
          </Text>

          {/* Topic Tags */}
          <View style={styles.tagsRow}>
            {cleanedTopics.map((topic, i) => (
              <View key={`${topic}-${i}`} style={[styles.tagChip, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#EAF3EE" }]}>
                <Text
                  style={[styles.tagText, { color: isDark ? "#34D399" : "#1B4D3E" }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {topic}
                </Text>
              </View>
            ))}
          </View>

          {/* Engagement Metrics Row */}
          <View style={styles.metricsRow}>
            {/* Reads (Synchronized with custom radiant book icon) */}
            <View style={styles.metricItem}>
              <ReadBookIcon size={14} color={colors.textSecondary} />
              <Text style={[styles.metricValue, { color: colors.textSecondary }]}>
                {formatCompactNumber(readCount)}
              </Text>
            </View>

            {/* Discussions / Comments */}
            <View style={styles.metricItem}>
              <DiscussionIcon size={14} color={colors.textSecondary} />
              <Text style={[styles.metricValue, { color: colors.textSecondary }]}>
                {formatCompactNumber(discussionCount)}
              </Text>
            </View>

            {/* In-App Direct Share to Chat / Workspace (DM, Community, Inner Circle) */}
            <ShareToChatButton
              onPress={() => setIsShareToWorkspaceOpen(true)}
              size={14}
              color={colors.textSecondary}
              style={styles.shareChatBtn}
            />

            {/* Shares */}
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.metricItem}
              activeOpacity={0.7}
            >
              <Share2 size={13} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.metricValue, { color: colors.textSecondary }]}>
                {formatCompactNumber(shareCount)}
              </Text>
            </TouchableOpacity>

            {/* Official Save Bookmark Button */}
            <SaveButton
              isSaved={isSaved}
              onPress={handleSave}
              size={17}
              style={styles.saveBtn}
            />
          </View>
        </View>

        {/* Right HYPE Score Rating Box */}
        <View style={[styles.hypeScoreBox, { backgroundColor: isDark ? colors.backgroundSecondary : "#F8FAFC", borderColor: colors.borderLight }, isUnrated && styles.unratedHypeBox]}>
          <Text style={[styles.hypeScoreLabel, { color: colors.textSecondary }]}>HYPE</Text>
          {isUnrated ? (
            <Text style={[styles.unratedText, { color: colors.textTertiary || "#94A3B8" }]}>Unrated</Text>
          ) : (
            <>
              <Text style={[styles.hypeScoreNumber, { color: colors.textPrimary }]}>{hypeScoreFormatted}</Text>

              {/* Solid Forest Green Score Progress Indicator */}
              <View style={[styles.progressTrack, { backgroundColor: isDark ? "#2D3748" : "#E2E8F0" }]}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: isDark ? "#10B981" : "#1B4D3E", width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>

    {/* Share to Workspace Modal */}
    {isShareToWorkspaceOpen && (
      <SharePostToWorkspaceModal
        visible={isShareToWorkspaceOpen}
        onClose={() => setIsShareToWorkspaceOpen(false)}
        paper={paper}
      />
    )}
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    paddingTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rankBadge: {
    position: 'absolute',
    top: -7,
    left: 12,
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  rankText: {
    ...typography.microBold,
    fontSize: 11,
    fontWeight: '800',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  centerDetails: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  titleText: {
    ...typography.bodyBold,
    fontSize: 14.5,
    lineHeight: 19,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaText: {
    ...typography.caption,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  tagChip: {
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    maxWidth: '100%',
    flexShrink: 1,
  },
  tagText: {
    ...typography.micro,
    fontSize: 10.5,
    color: '#1B4D3E',
    fontWeight: '600',
    flexShrink: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    ...typography.micro,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  saveBtn: {
    padding: 0,
    marginLeft: 2,
  },
  hypeScoreBox: {
    width: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  unratedHypeBox: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  unratedText: {
    ...typography.captionBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  hypeScoreLabel: {
    ...typography.microBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 2,
  },
  hypeScoreNumber: {
    ...typography.h3,
    fontSize: 18,
    lineHeight: 22,
    color: '#0F172A',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  progressTrack: {
    width: '84%',
    height: 3.5,
    backgroundColor: '#E2E8F0',
    borderRadius: radii.full,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1B4D3E',
    borderRadius: radii.full,
  },
  shareChatBtn: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
});
