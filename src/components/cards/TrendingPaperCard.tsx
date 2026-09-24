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
import { colors, radii, spacing, typography } from '../../theme';
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
              <Heart size={14} color={colors.textSecondary} />
              <Text style={styles.metricText}>{paper.likesCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <MessageCircle size={14} color={colors.textSecondary} />
              <Text style={styles.metricText}>{paper.discussionCount}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bookmark
              size={17}
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
    padding: spacing.md,
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundTertiary,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    ...typography.captionBold,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  yearText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
