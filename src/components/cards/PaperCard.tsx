import React, { useState, useRef } from 'react';
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
import { ArrowRight, ExternalLink, X, Quote, Copy, Check, GraduationCap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Paper } from '../../types';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Badge } from '../core/Badge';
import { SaveButton } from '../core/SaveButton';
import { Popover, PopoverItem, PopoverDivider } from '../core/Popover';
import { usePaperStore } from '../../store/usePaperStore';
import { useAuthStore } from '../../store/useAuthStore';

import { usePaperFigures } from '../../hooks/usePaperFigures';

interface PaperCardProps {
  paper: Paper;
  onRemove?: () => void; // for composer view
  style?: ViewStyle;
  compact?: boolean;
  fromPostId?: string;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  onRemove,
  style,
  compact = false,
  fromPostId,
}) => {
  const [isCitePopoverOpen, setIsCitePopoverOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<'apa' | 'bibtex' | null>(null);
  const citeBtnRef = useRef<View>(null);

  const isSavedInStore = usePaperStore(
    (s) =>
      s.savedPaperIds.has(paper.id) ||
      (paper.doi ? s.savedPaperIds.has(paper.doi) : false)
  );
  const isSaved = Boolean(isSavedInStore || paper.isSaved);
  const toggleSavePaper = usePaperStore((s) => s.toggleSavePaper);
  const currentUser = useAuthStore((s) => s.user);

  const handleCopyCitation = async (type: 'apa' | 'bibtex') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    let citationText = '';
    const authorNames = Array.isArray(paper.authors)
      ? paper.authors.map((a) => (typeof a === 'string' ? a : a?.name || 'Anonymous'))
      : [];
    const authorText = authorNames.length > 0
      ? (authorNames.length > 2 ? `${authorNames[0]} et al.` : authorNames.join(' & '))
      : 'Anonymous';
    const year = paper.publicationYear || (paper as any).year || 2024;
    const journal = paper.journal ? `${paper.journal}. ` : '';
    const doiStr = paper.doi ? `https://doi.org/${paper.doi}` : '';

    if (type === 'apa') {
      citationText = `${authorText} (${year}). ${paper.title}. ${journal}${doiStr}`.trim();
    } else {
      const firstAuthorLast = (authorNames[0] ? authorNames[0].split(' ').pop() : 'paper') || 'paper';
      const cleanKey = `${firstAuthorLast.toLowerCase().replace(/[^a-z0-9]/g, '')}${year}`;
      const authorsStr = authorNames.length > 0 ? authorNames.join(' and ') : 'Anonymous';
      citationText = `@article{${cleanKey},
  title={${paper.title || ''}},
  author={${authorsStr}},
  journal={${paper.journal || ''}},
  year={${year}}${paper.doi ? `,\n  doi={${paper.doi}}` : ''}
}`;
    }

    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(citationText);
    }
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
      setIsCitePopoverOpen(false);
    }, 600);
  };

  const handleOpenGoogleScholar = () => {
    setIsCitePopoverOpen(false);
    const query = encodeURIComponent(paper.title || paper.doi || '');
    Linking.openURL(`https://scholar.google.com/scholar?q=${query}`);
  };

  const handleSave = (e?: any) => {
    e?.stopPropagation?.();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleSavePaper(paper.id, currentUser?.id, paper);
  };

  const getJournalVariant = (journal: string) => {
    const j = journal.toLowerCase();
    if (j.includes('nature')) return 'nature';
    if (j.includes('science')) return 'science';
    if (j.includes('cell')) return 'cell';
    return 'generic';
  };

  const handleCardPress = () => {
    usePaperStore.getState().addPaper(paper);
    router.push({
      pathname: '/paper/[id]',
      params: {
        id: paper.id,
        doi: paper.doi || '',
        title: paper.title ? encodeURIComponent(paper.title) : '',
        url: paper.canonicalUrl || '',
        pdfUrl: paper.openAccessUrl || '',
        ...(fromPostId ? { fromPostId } : {}),
      },
    });
  };

  const handleOpenPublisher = (e: any) => {
    e.stopPropagation();
    if (paper.canonicalUrl) {
      Linking.openURL(paper.canonicalUrl);
    }
  };

  // Resolve figures automatically from paper object or live academic APIs
  const figures = usePaperFigures(paper);
  const primaryFigure = figures[0]?.url;
  const secondaryFigure = figures[1]?.url;
  const primaryCaption = figures[0]?.caption;
  const secondaryCaption = figures[1]?.caption;

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

      {/* Scientific Figure Preview Collage (1 or 2 Figures) */}
      {!compact && primaryFigure && (
        <View style={styles.imageContainer}>
          {secondaryFigure ? (
            <View style={styles.multiFigureRow}>
              <View style={styles.multiFigureCol}>
                <Image
                  source={{ uri: primaryFigure }}
                  style={styles.figureImage}
                  contentFit="cover"
                  transition={250}
                  cachePolicy="disk"
                  priority="high"
                />
                <View style={styles.figBadge}>
                  <Text style={styles.figBadgeText}>Fig. 1</Text>
                </View>
              </View>
              <View style={styles.multiFigureDivider} />
              <View style={styles.multiFigureCol}>
                <Image
                  source={{ uri: secondaryFigure }}
                  style={styles.figureImage}
                  contentFit="cover"
                  transition={250}
                  cachePolicy="disk"
                  priority="high"
                />
                <View style={styles.figBadge}>
                  <Text style={styles.figBadgeText}>Fig. 2</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, width: '100%', height: '100%' }}>
              <Image
                source={{ uri: primaryFigure }}
                style={styles.figureImage}
                contentFit="cover"
                transition={250}
                cachePolicy="disk"
                priority="high"
              />
              <View style={styles.figBadge}>
                <Text style={styles.figBadgeText}>Figure 1</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>
        {compact && primaryFigure && (
          <Image
            source={{ uri: primaryFigure }}
            style={styles.compactImage}
            contentFit="cover"
            cachePolicy="disk"
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

          {/* Journal Meta, Official Save Button & External Read Paper Link */}
          <View style={styles.footerRow}>
            <View style={styles.journalRow}>
              <Badge
                label={paper.journal}
                variant={getJournalVariant(paper.journal)}
              />
            </View>

            <View style={styles.actionsRow}>
              {/* Cite Popover Button */}
              <View ref={citeBtnRef} collapsable={false}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setIsCitePopoverOpen(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                  style={styles.citeButton}
                  activeOpacity={0.7}
                >
                  <Quote size={12} color="#0D9488" strokeWidth={2.4} />
                  <Text style={styles.citeButtonText}>Cite</Text>
                </TouchableOpacity>
              </View>

              <SaveButton
                isSaved={isSaved}
                onPress={handleSave}
                size={18}
                style={styles.saveBtn}
              />
              <TouchableOpacity
                accessibilityRole="link"
                accessibilityLabel={`Read paper on publisher website: ${paper.journal}`}
                hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                onPress={handleOpenPublisher}
                style={styles.linkButton}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Read paper</Text>
                <ExternalLink size={13} color={colors.accentLink} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Cite Popover */}
      <Popover
        visible={isCitePopoverOpen}
        onClose={() => setIsCitePopoverOpen(false)}
        anchorRef={citeBtnRef}
        position="top"
        align="end"
        estimatedWidth={215}
        estimatedHeight={140}
      >
        <PopoverItem
          icon={copiedType === 'apa' ? <Check size={16} color="#059669" /> : <Copy size={16} color="#475569" />}
          label={copiedType === 'apa' ? 'Copied APA Citation!' : 'Copy APA Citation'}
          subtitle="American Psychological Assn"
          active={copiedType === 'apa'}
          activeColor="#059669"
          onPress={() => handleCopyCitation('apa')}
        />
        <PopoverDivider />
        <PopoverItem
          icon={copiedType === 'bibtex' ? <Check size={16} color="#059669" /> : <Copy size={16} color="#475569" />}
          label={copiedType === 'bibtex' ? 'Copied BibTeX!' : 'Copy BibTeX'}
          subtitle="LaTeX / Overleaf format"
          active={copiedType === 'bibtex'}
          activeColor="#059669"
          onPress={() => handleCopyCitation('bibtex')}
        />
        <PopoverDivider />
        <PopoverItem
          icon={<GraduationCap size={16} color="#2563EB" />}
          label="Google Scholar"
          subtitle="Search citations & metrics"
          onPress={handleOpenGoogleScholar}
        />
      </Popover>
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
    height: 165,
    width: '100%',
    backgroundColor: colors.backgroundTertiary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    position: 'relative',
  },
  multiFigureRow: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  multiFigureCol: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  multiFigureDivider: {
    width: 1.5,
    height: '100%',
    backgroundColor: colors.borderLight,
  },
  figureImage: {
    width: '100%',
    height: '100%',
  },
  figBadge: {
    position: 'absolute',
    bottom: spacing.xs + 2,
    left: spacing.xs + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm - 2,
  },
  figBadgeText: {
    ...typography.microBold,
    color: colors.white,
    fontSize: 11,
    letterSpacing: 0.2,
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  citeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  citeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  saveBtn: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
});
