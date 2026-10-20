import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Paper } from '../../types';
import { colors as staticColors, radii, spacing, typography, layout, useColors, useIsDark } from '../../theme';
import { Badge } from '../core/Badge';
import { DiscussionIcon } from '../core/DiscussionIcon';
import { LikeIcon } from '../core/LikeIcon';
import { SaveButton } from '../core/SaveButton';
import { usePaperStore } from '../../store/usePaperStore';

interface TrendingPaperCardProps {
  paper: Paper;
  style?: ViewStyle;
}

export const TrendingPaperCard: React.FC<TrendingPaperCardProps> = ({
  paper,
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
  const toggleSave = usePaperStore((s) => s.toggleSavePaper);

  const handleCardPress = () => {
    router.push({
      pathname: '/paper/[id]',
      params: { id: paper.id },
    });
  };

  const handleSave = (e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSave(paper.id, undefined, paper);
  };

  const getJournalVariant = (journal: string) => {
    const j = journal.toLowerCase();
    if (j.includes('nature')) return 'nature';
    if (j.includes('science')) return 'science';
    if (j.includes('cell')) return 'cell';
    return 'generic';
  };

  const figureUrl = paper.figures?.[0]?.url;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }, style]}
    >
      {/* Thumbnail */}
      {figureUrl && (
        <Image
          source={{ uri: figureUrl }}
          style={[styles.thumbnail, { backgroundColor: colors.backgroundSecondary }]}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Info */}
      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>
          {paper.title}
        </Text>

        <View style={styles.metaRow}>
          <Badge
            label={paper.journal}
            variant={getJournalVariant(paper.journal)}
          />
          <Text style={[styles.yearText, { color: colors.textSecondary }]}>({paper.publicationYear})</Text>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <LikeIcon size={15} isLiked={Boolean(paper.isLiked)} color={colors.textSecondary} />
              <Text style={[styles.metricText, { color: colors.textSecondary }]}>{paper.likesCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <DiscussionIcon size={15} color={colors.textSecondary} />
              <Text style={[styles.metricText, { color: colors.textSecondary }]}>{paper.discussionCount}</Text>
            </View>
          </View>

          <SaveButton
            isSaved={isSaved}
            onPress={handleSave}
            size={18}
            style={styles.saveBtn}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: staticColors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    padding: spacing.md + 2,
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: radii.sm + 2,
    backgroundColor: staticColors.backgroundTertiary,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    ...typography.bodyBold,
    color: staticColors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  yearText: {
    ...typography.caption,
    color: staticColors.textSecondary,
    fontSize: 12.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    ...typography.metadata,
    color: staticColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  saveBtn: {
    padding: spacing.xs,
    minHeight: layout.touchTargetMin - 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
