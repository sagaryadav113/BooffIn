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
import { colors, radii, spacing, typography } from '../../theme';
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
          {/* Title */}
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
              onPress={handleOpenPublisher}
              style={styles.linkButton}
              activeOpacity={0.7}
              accessibilityLabel={`Read paper on publisher website: ${paper.journal}`}
            >
              <Text style={styles.linkText}>Read paper</Text>
              <ExternalLink size={13} color={colors.accentLink} strokeWidth={2.2} />
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    height: 130,
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
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    marginRight: spacing.md,
  },
  content: {
    padding: spacing.md,
    flexDirection: 'row',
  },
  title: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs + 2,
    fontWeight: '700',
  },
  compactTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  yearText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  linkText: {
    ...typography.micro,
    fontWeight: '600',
    color: colors.accentLink,
  },
});
