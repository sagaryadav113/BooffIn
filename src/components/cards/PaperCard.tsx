import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowRight, ExternalLink, X } from 'lucide-react-native';
import { Paper } from '../../types';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Badge } from '../core/Badge';

interface PaperCardProps {
  paper: Paper;
  onRemove?: () => void; // for composer view
  style?: ViewStyle;
  compact?: boolean;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  onRemove,
  style,
  compact = false,
}) => {
  const getJournalVariant = (journal: string) => {
    const j = journal.toLowerCase();
    if (j.includes('nature')) return 'nature';
    if (j.includes('science')) return 'science';
    if (j.includes('cell')) return 'cell';
    return 'generic';
  };

  const handleCardPress = () => {
    router.push({
      pathname: '/paper/[id]',
      params: { id: paper.id },
    });
  };

  const handleOpenPublisher = (e: any) => {
    e.stopPropagation();
    if (paper.canonicalUrl) {
      Linking.openURL(paper.canonicalUrl);
    }
  };

  const figures = paper.figures || [];
  const primaryFigure = figures[0]?.url;
  const secondaryFigure = figures[1]?.url;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      style={[styles.container, compact && styles.compactContainer, style]}
    >
      {/* Optional Remove Button for Composer */}
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Scientific Figure Preview Collage */}
      {!compact && primaryFigure && (
        <View style={styles.imageContainer}>
          {secondaryFigure ? (
            <View style={styles.multiFigureRow}>
              <View style={styles.multiFigureCol}>
                <Image
                  source={{ uri: primaryFigure }}
                  style={styles.figureImage}
                  contentFit="cover"
                  transition={200}
                />
              </View>
              <View style={styles.multiFigureDivider} />
              <View style={styles.multiFigureCol}>
                <Image
                  source={{ uri: secondaryFigure }}
                  style={styles.figureImage}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: primaryFigure }}
              style={styles.figureImage}
              contentFit="cover"
              transition={200}
            />
          )}
        </View>
      )}

      <View style={styles.content}>
        {compact && primaryFigure && (
          <Image
            source={{ uri: primaryFigure }}
            style={styles.compactImage}
            contentFit="cover"
          />
        )}

        <View style={{ flex: 1 }}>
          {/* Paper Title (16–18px semibold) */}
          <Text
            numberOfLines={compact ? 2 : 3}
            style={[styles.title, compact && styles.compactTitle]}
          >
            {paper.title}
          </Text>

          {/* Journal Meta & External Read Paper Link */}
          <View style={styles.footerRow}>
            <View style={styles.journalRow}>
              <Badge
                label={paper.journal}
                variant={getJournalVariant(paper.journal)}
              />
              <Text style={styles.yearText}>
                {paper.journal} ({paper.publicationYear})
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="link"
              accessibilityLabel={`Read paper on publisher website: ${paper.journal}`}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              onPress={handleOpenPublisher}
              style={styles.linkButton}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>Read paper</Text>
              <ExternalLink size={14} color={colors.accentLink} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  compactContainer: {
    padding: spacing.md,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    height: 140,
    width: '100%',
    backgroundColor: colors.backgroundTertiary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  multiFigureRow: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  multiFigureCol: {
    flex: 1,
    height: '100%',
  },
  multiFigureDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.borderLight,
  },
  figureImage: {
    width: '100%',
    height: '100%',
  },
  compactImage: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    marginRight: spacing.md,
  },
  content: {
    padding: spacing.md + 2,
    flexDirection: 'row',
  },
  title: {
    ...typography.contentTitle,
    fontSize: 16.5,
    lineHeight: 22.5,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
    fontWeight: '600',
  },
  compactTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs + 2,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  yearText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: layout.touchTargetMin - 12,
    paddingVertical: 2,
  },
  linkText: {
    ...typography.captionMedium,
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentLink,
  },
});
