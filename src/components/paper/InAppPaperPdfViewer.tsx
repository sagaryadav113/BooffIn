import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  BookOpen,
  FileText,
  Globe,
  Maximize2,
  FileCheck,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { colors, radii, spacing, typography } from '../../theme';
import { Badge } from '../core/Badge';
import { Paper } from '../../types';

export interface InAppPaperPdfViewerProps {
  paper: Paper;
  pdfUrl: string;
  isDirectPdf: boolean;
  isArxivPdf: boolean;
  onSwitchToArticleView?: () => void;
}

export const InAppPaperPdfViewer: React.FC<InAppPaperPdfViewerProps> = ({
  paper,
  pdfUrl,
  isDirectPdf,
  isArxivPdf,
  onSwitchToArticleView,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasFrameError, setHasFrameError] = useState<boolean>(false);

  const handleZoomIn = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setZoomLevel((z) => Math.min(1.8, parseFloat((z + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setZoomLevel((z) => Math.max(0.75, parseFloat((z - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setZoomLevel(1.0);
  };

  const handleOpenExternal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const targetUrl = pdfUrl || paper.canonicalUrl || (paper.doi ? `https://doi.org/${paper.doi}` : '');
    if (!targetUrl) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      await WebBrowser.openBrowserAsync(targetUrl);
    }
  };

  const authorsString = paper.authors && paper.authors.length > 0
    ? paper.authors.map((a) => a.name).join(', ')
    : 'Research Contributors';

  // Format abstract into realistic readable academic paragraphs if dense
  const abstractParagraphs = React.useMemo(() => {
    if (!paper.abstract) {
      return [
        'Full scientific manuscript published and peer-reviewed in ' +
          (paper.journal || 'academic literature') +
          '. You can read the complete publication or open the high-fidelity PDF directly.',
      ];
    }
    const raw = paper.abstract.trim();
    // Split on double newlines or long sentences if unformatted
    if (raw.includes('\n\n')) {
      return raw.split('\n\n').filter(Boolean);
    }
    return [raw];
  }, [paper.abstract, paper.journal]);

  return (
    <View style={styles.container}>
      {/* ── TOP ACADEMIC CONTROLS TOOLBAR ── */}
      <View style={styles.controlsBar}>
        <View style={styles.controlsLeft}>
          <Badge
            label={paper.journal || (isDirectPdf ? 'Open Access' : 'Publisher')}
            variant={isDirectPdf ? 'oa' : 'generic'}
          />
          <Text style={styles.controlsSubtext} numberOfLines={1}>
            {isArxivPdf ? 'arXiv Open Access Stream' : 'Academic Manuscript Sheet'}
          </Text>
        </View>

        <View style={styles.controlsRight}>
          {/* Zoom controls */}
          <View style={styles.zoomGroup}>
            <TouchableOpacity
              onPress={handleZoomOut}
              disabled={zoomLevel <= 0.75}
              style={[styles.zoomBtn, zoomLevel <= 0.75 && styles.zoomBtnDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <ZoomOut size={12} color={zoomLevel <= 0.75 ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResetZoom}
              style={styles.zoomResetBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Text style={styles.zoomResetText}>{Math.round(zoomLevel * 100)}%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleZoomIn}
              disabled={zoomLevel >= 1.8}
              style={[styles.zoomBtn, zoomLevel >= 1.8 && styles.zoomBtnDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <ZoomIn size={12} color={zoomLevel >= 1.8 ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Open Full PDF Button */}
          <TouchableOpacity
            onPress={handleOpenExternal}
            style={styles.controlPillBtn}
            activeOpacity={0.75}
          >
            <ExternalLink size={12} color="#FFFFFF" />
            <Text style={styles.controlPillBtnText}>Original PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN DOCUMENT READER ── */}
      {/* 
        Case 1: arXiv PDFs allow direct inline iframe embedding without CORS/X-Frame-Options 
      */}
      {Platform.OS === 'web' && isArxivPdf && !hasFrameError ? (
        <View style={styles.webPdfContainer}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: 840,
              border: 'none',
              backgroundColor: '#F9FAFB',
              display: 'block',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              marginBottom: zoomLevel !== 1 ? `${(zoomLevel - 1) * 840}px` : undefined,
            }}
            title={paper.title}
            allow="fullscreen"
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={() => setHasFrameError(true)}
          />
        </View>
      ) : (
        /* 
          Case 2: Authentic Academic Manuscript Sheet
          Matches the clean scientific layout (PLOS ONE / Nature / Frontiers style)
          Prevents third-party reCAPTCHAs or broken iframe errors.
        */
        <View style={styles.manuscriptSheet}>
          {/* Running Top Academic Header (PLOS ONE / Frontiers style) */}
          <View style={styles.runningHeaderRow}>
            <Text style={styles.runningJournalText}>
              {paper.journal ? paper.journal.toUpperCase() : 'RESEARCH MANUSCRIPT'}
            </Text>
            <Text style={styles.runningPaperTitle} numberOfLines={1}>
              {paper.title}
            </Text>
          </View>
          <View style={styles.headerRule} />

          {/* Publisher & Open Access Banner */}
          <View style={styles.publisherBanner}>
            <View style={styles.publisherBannerLeft}>
              <View style={styles.verifiedCheckBadge}>
                <CheckCircle2 size={13} color="#1B4D3E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.publisherBannerTitle}>
                  Peer-Reviewed Research Publication
                </Text>
                <Text style={styles.publisherBannerSubtitle}>
                  Published in {paper.journal || 'Academic Journal'} ({paper.publicationYear})
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleOpenExternal}
              style={styles.openPdfActionBtn}
              activeOpacity={0.85}
            >
              <FileText size={13} color="#FFFFFF" />
              <Text style={styles.openPdfActionBtnText}>High-Res PDF</Text>
              <ExternalLink size={11} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Manuscript Main Content */}
          <View
            style={[
              styles.manuscriptBody,
              {
                paddingHorizontal: Math.round(spacing.lg * zoomLevel),
                paddingVertical: Math.round(spacing.md * zoomLevel),
              },
            ]}
          >
            {/* Title */}
            <Text
              style={[
                styles.manuscriptTitle,
                {
                  fontSize: Math.round(21 * zoomLevel),
                  lineHeight: Math.round(29 * zoomLevel),
                },
              ]}
            >
              {paper.title}
            </Text>

            {/* Authors & Affiliation */}
            <Text
              style={[
                styles.manuscriptAuthors,
                {
                  fontSize: Math.round(13.5 * zoomLevel),
                  lineHeight: Math.round(20 * zoomLevel),
                },
              ]}
            >
              {authorsString}
            </Text>

            {/* Citation Meta Bar */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {paper.journal || 'Peer-Reviewed Literature'} · {paper.publicationYear}
              </Text>
              {paper.doi && (
                <Text style={styles.metaDoi} numberOfLines={1}>
                  DOI: {paper.doi}
                </Text>
              )}
            </View>

            <View style={styles.sectionDivider} />

            {/* Abstract Section Header */}
            <View style={styles.abstractHeadingRow}>
              <Text
                style={[
                  styles.abstractHeadingText,
                  { fontSize: Math.round(12 * zoomLevel) },
                ]}
              >
                ABSTRACT & KEY FINDINGS
              </Text>
            </View>

            {/* Academic Formatted Text Paragraphs */}
            {abstractParagraphs.map((para, idx) => (
              <Text
                key={idx}
                style={[
                  styles.manuscriptParagraph,
                  {
                    fontSize: Math.round(15 * zoomLevel),
                    lineHeight: Math.round(25 * zoomLevel),
                    marginBottom: Math.round(16 * zoomLevel),
                  },
                ]}
              >
                {para}
              </Text>
            ))}

            {/* Figures Gallery (if available) */}
            {paper.figures && paper.figures.length > 0 && (
              <View style={styles.figuresContainer}>
                <Text style={styles.figureSectionTitle}>FIGURES & SCHEMATICS</Text>
                {paper.figures.map((fig) => (
                  <View key={fig.id} style={styles.figureItem}>
                    <Image
                      source={{ uri: fig.url }}
                      style={styles.figureImage}
                      contentFit="contain"
                      transition={200}
                    />
                    {fig.caption && (
                      <Text style={styles.figureCaption}>{fig.caption}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* In-Depth Academic Reading Footnote */}
            <View style={styles.manuscriptFooter}>
              <Text style={styles.manuscriptFooterText}>
                Indexed on BOOFFIN · Evaluated by scientific community
              </Text>
              <TouchableOpacity
                onPress={handleOpenExternal}
                style={styles.footerPdfLink}
                activeOpacity={0.7}
              >
                <ExternalLink size={12} color="#1B4D3E" />
                <Text style={styles.footerPdfLinkText}>
                  Download original publisher PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── BOTTOM DOCK FOOTER SPACER ── */}
      <View style={styles.bottomDockSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  controlsSubtext: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontFamily: typography.caption.fontFamily,
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  zoomBtn: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  zoomResetBtn: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  zoomResetText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  controlPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1B4D3E',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  controlPillBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webPdfContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
  },

  /* ── ACADEMIC MANUSCRIPT SHEET STYLES ── */
  manuscriptSheet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  runningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    gap: spacing.md,
  },
  runningJournalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.8,
    fontFamily: Platform.select({
      web: "'Georgia', 'Times New Roman', serif",
      default: 'serif',
    }),
  },
  runningPaperTitle: {
    fontSize: 11.5,
    color: '#6B7280',
    flex: 1,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  headerRule: {
    height: 1.5,
    backgroundColor: '#111827',
    marginBottom: spacing.md,
  },
  publisherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  publisherBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  verifiedCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publisherBannerTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  publisherBannerSubtitle: {
    fontSize: 10.5,
    color: '#15803D',
  },
  openPdfActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1B4D3E',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  openPdfActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manuscriptBody: {
    backgroundColor: '#FFFFFF',
  },
  manuscriptTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.xs,
    fontFamily: Platform.select({
      web: "'Georgia', 'Times New Roman', serif",
      default: 'serif',
    }),
  },
  manuscriptAuthors: {
    color: '#374151',
    marginBottom: spacing.xs,
    fontStyle: 'italic',
    fontFamily: Platform.select({
      web: "'Georgia', 'Times New Roman', serif",
      default: 'serif',
    }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaDoi: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.select({
      web: 'monospace',
      default: undefined,
    }),
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: spacing.md,
  },
  abstractHeadingRow: {
    marginBottom: spacing.sm,
  },
  abstractHeadingText: {
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#111827',
    fontFamily: Platform.select({
      web: "'Georgia', 'Times New Roman', serif",
      default: 'serif',
    }),
  },
  manuscriptParagraph: {
    color: '#1F2937',
    textAlign: Platform.select({ web: 'justify', default: 'left' }),
    fontFamily: Platform.select({
      web: "'Georgia', 'Times New Roman', 'Cambria', serif",
      default: 'serif',
    }),
    letterSpacing: 0.15,
  },
  figuresContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  figureSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#4B5563',
    marginBottom: spacing.sm,
  },
  figureItem: {
    marginBottom: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: radii.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  figureImage: {
    width: '100%',
    height: 240,
    borderRadius: radii.xs,
  },
  figureCaption: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  manuscriptFooter: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  manuscriptFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  footerPdfLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerPdfLinkText: {
    fontSize: 11.5,
    color: '#1B4D3E',
    fontWeight: '600',
  },
  bottomDockSpacer: {
    height: 70,
  },
});
