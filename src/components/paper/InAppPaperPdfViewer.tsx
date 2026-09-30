import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  ExternalLink,
  BookOpen,
  FileText,
  Globe,
  Maximize2,
  FileCheck,
  AlertCircle,
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasFrameError, setHasFrameError] = useState<boolean>(false);

  // Derive the cleanest, most embeddable full PDF stream URL
  const effectiveStreamUrl = useMemo(() => {
    const raw = (pdfUrl || paper.openAccessUrl || paper.canonicalUrl || '').trim();

    // 1. arXiv: direct unblocked PDF stream
    const arxivMatch = raw.match(/arxiv\.org\/(?:abs|pdf)\/([\w.-]+)/i);
    if (arxivMatch) {
      const id = arxivMatch[1].replace(/\.pdf$/i, '');
      return `https://arxiv.org/pdf/${id}.pdf`;
    }
    if (paper.doi) {
      const doiArxiv = paper.doi.match(/arxiv\.org\/(?:abs|pdf)\/([\w.-]+)/i);
      if (doiArxiv) {
        return `https://arxiv.org/pdf/${doiArxiv[1].replace(/\.pdf$/i, '')}.pdf`;
      }
    }

    // 2. PubMed Central (PMC)
    const pmcMatch = raw.match(/PMC(\d+)/i) || (paper.doi && paper.doi.match(/PMC(\d+)/i));
    if (pmcMatch) {
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcMatch[1]}/pdf/`;
    }

    // 3. EuropePMC ptpmcrender URL -> convert to NIH PMC
    if (raw.includes('ptpmcrender.fcgi') || raw.includes('accid=')) {
      const accMatch = raw.match(/accid=(?:PMC)?(\d+)/i);
      if (accMatch) {
        return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${accMatch[1]}/pdf/`;
      }
    }

    return raw;
  }, [pdfUrl, paper.openAccessUrl, paper.canonicalUrl, paper.doi]);

  // arXiv is the only repository that allows third-party inline <iframe> embedding
  // without X-Frame-Options: SAMEORIGIN blocks
  const canEmbedIframe = useMemo(() => {
    if (!effectiveStreamUrl) return false;
    return effectiveStreamUrl.includes('arxiv.org/pdf/');
  }, [effectiveStreamUrl]);

  const handleOpenExternal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const target = effectiveStreamUrl || paper.canonicalUrl || (paper.doi ? `https://doi.org/${paper.doi}` : '');
    if (!target) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      await WebBrowser.openBrowserAsync(target, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#1B4D3E',
        controlsColor: '#FFFFFF',
        showTitle: true,
        enableBarCollapsing: true,
        showInRecents: false,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* ── PDF DOCUMENT CONTROL HEADER ── */}
      <View style={styles.controlsBar}>
        <View style={styles.controlsLeft}>
          <Badge
            label={paper.journal || (isDirectPdf ? 'Open Access' : 'Publisher')}
            variant={isDirectPdf ? 'oa' : 'generic'}
          />
          <Text style={styles.controlsSubtext} numberOfLines={1}>
            {canEmbedIframe ? 'Inline Document Stream' : 'Full Manuscript Document'}
          </Text>
        </View>

        <View style={styles.controlsRight}>
          {onSwitchToArticleView && (
            <TouchableOpacity
              onPress={onSwitchToArticleView}
              style={styles.controlSecondaryBtn}
              activeOpacity={0.75}
            >
              <BookOpen size={13} color={colors.textPrimary} />
              <Text style={styles.controlSecondaryBtnText}>Article View</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleOpenExternal}
            style={styles.controlPrimaryBtn}
            activeOpacity={0.75}
          >
            <Maximize2 size={13} color="#FFFFFF" />
            <Text style={styles.controlPrimaryBtnText}>Full View</Text>
            <ExternalLink size={11} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── IN-APP DOCUMENT VIEWER ── */}
      {Platform.OS === 'web' ? (
        <View style={styles.webPdfWrapper}>
          {canEmbedIframe && !hasFrameError ? (
            /* arXiv PDF Stream (Embeds natively without X-Frame-Options blocks) */
            <>
              <iframe
                src={effectiveStreamUrl}
                style={{
                  width: '100%',
                  height: 980,
                  border: 'none',
                  backgroundColor: '#525659',
                  display: 'block',
                }}
                title={paper.title}
                allow="fullscreen"
                loading="eager"
                onLoad={() => setIsLoading(false)}
                onError={() => setHasFrameError(true)}
              />
              <View style={styles.pdfHelperBanner}>
                <View style={styles.helperLeft}>
                  <Globe size={13} color="#6B7280" />
                  <Text style={styles.helperText} numberOfLines={1}>
                    Streaming live arXiv open-access preprint.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleOpenExternal}
                  style={styles.helperActionLink}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={12} color="#1B4D3E" />
                  <Text style={styles.helperActionText}>Open in Dedicated Window</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* 
              Publisher Document Card (Frontiers, Nature, PMC, PLOS, Elsevier, Springer)
              Prevents the desktop browser's grey 'refused to connect' error caused by 
              the publisher's X-Frame-Options: SAMEORIGIN header.
            */
            <View style={styles.publisherDocumentCard}>
              <View style={styles.publisherBadgeRow}>
                <View style={styles.checkCircleWrap}>
                  <CheckCircle2 size={16} color="#15803D" />
                </View>
                <Text style={styles.publisherBadgeLabel}>
                  {paper.journal || 'Academic Journal'} · Verified Full Document
                </Text>
              </View>

              <Text style={styles.publisherDocTitle}>{paper.title}</Text>
              <Text style={styles.publisherDocAuthors}>
                {paper.authors && paper.authors.length > 0
                  ? paper.authors.map((a) => a.name).join(', ')
                  : 'Academic Authors'}
              </Text>

              {paper.doi && (
                <View style={styles.doiPill}>
                  <Text style={styles.doiPillText}>DOI: {paper.doi}</Text>
                </View>
              )}

              <View style={styles.documentActionGroup}>
                <TouchableOpacity
                  onPress={handleOpenExternal}
                  style={styles.openFullPdfHeroBtn}
                  activeOpacity={0.85}
                >
                  <FileText size={18} color="#FFFFFF" />
                  <Text style={styles.openFullPdfHeroBtnText}>
                    Open Full Multi-Page PDF (High-Resolution)
                  </Text>
                  <ExternalLink size={16} color="#FFFFFF" />
                </TouchableOpacity>

                {onSwitchToArticleView && (
                  <TouchableOpacity
                    onPress={onSwitchToArticleView}
                    style={styles.readArticleSecondaryBtn}
                    activeOpacity={0.85}
                  >
                    <BookOpen size={16} color={colors.textPrimary} />
                    <Text style={styles.readArticleSecondaryBtnText}>
                      Read Formatted Article in BooffIn
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.publisherSecurityNotice}>
                <Globe size={13} color="#6B7280" />
                <Text style={styles.publisherSecurityText}>
                  {paper.publisher || paper.journal || 'This publisher'} delivers vector multi-page PDFs directly via its official repository. Click above to open with complete fidelity and full page controls.
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* Mobile Native Android APK / iOS Presentation Card */
        <View style={styles.nativePdfCard}>
          <View style={styles.nativePdfIconWrap}>
            <FileText size={36} color="#1B4D3E" />
          </View>
          <Text style={styles.nativePdfTitle}>{paper.title}</Text>
          <Text style={styles.nativePdfJournal}>
            {paper.journal || 'Academic Literature'} · {paper.publicationYear}
          </Text>

          <View style={styles.nativePdfActionsRow}>
            <TouchableOpacity
              style={styles.nativePrimaryBtn}
              onPress={handleOpenExternal}
              activeOpacity={0.85}
            >
              <FileText size={16} color="#FFFFFF" />
              <Text style={styles.nativePrimaryBtnText}>Open Full Multi-Page PDF</Text>
              <ExternalLink size={14} color="#FFFFFF" />
            </TouchableOpacity>

            {onSwitchToArticleView && (
              <TouchableOpacity
                style={styles.nativeSecondaryBtn}
                onPress={onSwitchToArticleView}
                activeOpacity={0.85}
              >
                <BookOpen size={16} color={colors.textPrimary} />
                <Text style={styles.nativeSecondaryBtnText}>Formatted Article View</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Dock spacer so paper scroll content is never clipped by the floating rating dock */}
      <View style={styles.dockBottomSpacer} />
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
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: spacing.sm,
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  controlsSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.caption.fontFamily,
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  controlSecondaryBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  controlPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1B4D3E',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  controlPrimaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webPdfWrapper: {
    width: '100%',
    backgroundColor: '#525659',
  },
  pdfHelperBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    flexWrap: 'wrap',
    gap: 8,
  },
  helperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  helperText: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  helperActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helperActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1B4D3E',
  },

  /* ── PUBLISHER DOCUMENT CARD STYLES ── */
  publisherDocumentCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    alignItems: 'center',
  },
  publisherBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  checkCircleWrap: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publisherBadgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  publisherDocTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    maxWidth: 620,
    lineHeight: 28,
    marginBottom: spacing.xs,
    fontFamily: Platform.select({
      web: "'Georgia', 'Times New Roman', serif",
      default: 'serif',
    }),
  },
  publisherDocAuthors: {
    fontSize: 13.5,
    color: '#4B5563',
    textAlign: 'center',
    maxWidth: 580,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  doiPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.lg,
  },
  doiPillText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
  },
  documentActionGroup: {
    width: '100%',
    maxWidth: 440,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  openFullPdfHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B4D3E',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    shadowColor: '#1B4D3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  openFullPdfHeroBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  readArticleSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  readArticleSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  publisherSecurityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: 500,
    backgroundColor: '#F9FAFB',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
  },
  publisherSecurityText: {
    fontSize: 11.5,
    color: '#6B7280',
    lineHeight: 16,
    flex: 1,
  },

  /* ── MOBILE NATIVE CARD STYLES ── */
  nativePdfCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  nativePdfIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  nativePdfTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  nativePdfJournal: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  nativePdfActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 420,
  },
  nativePrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B4D3E',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  nativePrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nativeSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  nativeSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dockBottomSpacer: {
    height: 80,
  },
});
