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
import { Heart, MessageCircle, Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Paper } from '../../types';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Badge } from '../core/Badge';
import { usePaperStore } from '../../store/usePaperStore';

interface TrendingPaperCardProps {
  paper: Paper;
  style?: ViewStyle;
}

export const TrendingPaperCard: React.FC<TrendingPaperCardProps> = ({
  paper,
  style,
}) => {
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
    toggleSave(paper.id);
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
      style={[styles.container, style]}
    >
      {/* Thumbnail */}
      {figureUrl && (
        <Image
          source={{ uri: figureUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Info */}
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {paper.title}
        </Text>

        <View style={styles.metaRow}>
          <Badge
            label={paper.journal}
            variant={getJournalVariant(paper.journal)}
          />
          <Text style={styles.yearText}>({paper.publicationYear})</Text>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Heart size={15} color={colors.textSecondary} />
              <Text style={styles.metricText}>{paper.likesCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <MessageCircle size={15} color={colors.textSecondary} />
              <Text style={styles.metricText}>{paper.discussionCount}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.saveBtn}
          >
            <Bookmark
              size={18}
              color={paper.isSaved ? colors.black : colors.textSecondary}
              fill={paper.isSaved ? colors.black : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md + 2,
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.backgroundTertiary,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
