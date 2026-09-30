import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
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
    setZoomLevel((z) => Math.min(2.5, parseFloat((z + 0.15).toFixed(2))));
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
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(pdfUrl, '_blank');
    } else {
      await WebBrowser.openBrowserAsync(pdfUrl);
    }
  };

  // Embeddable URL resolution
  // Google Docs Viewer bypasses X-Frame-Options on web for external PDF files
  const getEmbeddableViewerUrl = (): string => {
    if (isArxivPdf) return pdfUrl;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
  };

  return (
    <View style={styles.container}>
      {/* ── READER CONTROL TOOLBAR ── */}
      <View style={styles.controlsBar}>
        <View style={styles.controlsLeft}>
          <Badge
            label={paper.journal || (isDirectPdf ? 'Open Access' : 'Publisher')}
            variant={isDirectPdf ? 'oa' : 'generic'}
          />
          <Text style={styles.controlsSubtext} numberOfLines={1}>
            {isDirectPdf ? 'Full Manuscript' : 'Publisher Document'}
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
              disabled={zoomLevel >= 2.5}
              style={[styles.zoomBtn, zoomLevel >= 2.5 && styles.zoomBtnDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <ZoomIn size={12} color={zoomLevel >= 2.5 ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Open External Tab Button */}
          <TouchableOpacity
            onPress={handleOpenExternal}
            style={styles.controlPillBtn}
            activeOpacity={0.75}
          >
            <Maximize2 size={12} color={colors.textPrimary} />
            <Text style={styles.controlPillBtnText}>Full View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── EMBEDDED PDF STREAM / VIEWER ── */}
      {Platform.OS === 'web' ? (
        <View style={styles.webPdfContainer}>
          {!hasFrameError ? (
            <iframe
              src={getEmbeddableViewerUrl()}
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
          ) : (
            // Fallback Card if publisher restricts framing
            <View style={styles.publisherFallbackCard}>
              <FileCheck size={32} color="#0F4C81" />
              <Text style={styles.fallbackTitle}>Protected Publisher Manuscript</Text>
              <Text style={styles.fallbackDesc}>
                {paper.publisher || paper.journal || 'This publisher'} restricts inline document framing. You can open the original PDF in high fidelity or read the complete formatted article view in BooffIn.
              </Text>

              <View style={styles.fallbackActionsRow}>
                <TouchableOpacity
                  style={styles.fallbackPrimaryBtn}
                  onPress={handleOpenExternal}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={14} color="#FFFFFF" />
                  <Text style={styles.fallbackPrimaryBtnText}>Open Original PDF</Text>
                </TouchableOpacity>

                {onSwitchToArticleView && (
                  <TouchableOpacity
                    style={styles.fallbackSecondaryBtn}
                    onPress={onSwitchToArticleView}
                    activeOpacity={0.8}
                  >
                    <BookOpen size={14} color={colors.textPrimary} />
                    <Text style={styles.fallbackSecondaryBtnText}>Formatted Article View</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Document Footer Banner */}
          <View style={styles.footerBar}>
            <View style={styles.footerLeft}>
              <Globe size={13} color={colors.textSecondary} />
              <Text style={styles.footerText} numberOfLines={1}>
                {isArxivPdf ? 'arXiv Open Access Repository' : `${paper.journal || 'Publisher'} Full Document`}
              </Text>
            </View>
            <View style={styles.footerActions}>
              <TouchableOpacity
                onPress={handleOpenExternal}
                style={styles.footerLinkBtn}
              >
                <ExternalLink size={11} color={colors.accentLink} />
                <Text style={styles.footerLinkText}>Open New Tab</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // Mobile (Native Android / iOS) Native Card with Embedded Reader Actions
        <View style={styles.nativePdfCard}>
          <View style={styles.nativePdfIconWrap}>
            <FileText size={32} color="#1B4D3E" />
          </View>
          <Text style={styles.nativePdfTitle}>{paper.title}</Text>
          <Text style={styles.nativePdfJournal}>
            {paper.journal || 'Peer-Reviewed Research Publication'} · {paper.publicationYear}
          </Text>

          <View style={styles.nativePdfActionsRow}>
            <TouchableOpacity
              style={styles.nativePrimaryBtn}
              onPress={handleOpenExternal}
              activeOpacity={0.85}
            >
              <FileText size={15} color="#FFFFFF" />
              <Text style={styles.nativePrimaryBtnText}>Open High-Fidelity PDF</Text>
            </TouchableOpacity>

            {onSwitchToArticleView && (
              <TouchableOpacity
                style={styles.nativeSecondaryBtn}
                onPress={onSwitchToArticleView}
                activeOpacity={0.85}
              >
                <BookOpen size={15} color={colors.textPrimary} />
                <Text style={styles.nativeSecondaryBtnText}>Read Formatted Article</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    borderColor: colors.borderLight,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  zoomBtn: {
    padding: 3,
    borderRadius: 3,
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  zoomResetBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomResetText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  controlPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  controlPillBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  webPdfContainer: {
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  footerLinkText: {
    fontSize: 11.5,
    color: colors.accentLink,
    fontWeight: '600',
  },
  publisherFallbackCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#F8FAFC',
    gap: spacing.sm,
  },
  fallbackTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 4,
  },
  fallbackDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 420,
    marginBottom: spacing.xs,
  },
  fallbackActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  fallbackPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B4D3E',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  fallbackPrimaryBtnText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12.5,
  },
  fallbackSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  fallbackSecondaryBtnText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12.5,
  },
  nativePdfCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#FAFAFA',
    gap: spacing.xs,
  },
  nativePdfIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  nativePdfTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  nativePdfJournal: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  nativePdfActionsRow: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.xs + 2,
  },
  nativePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#1B4D3E',
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  nativePrimaryBtnText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  nativeSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 11,
    borderRadius: radii.md,
  },
  nativeSecondaryBtnText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
});
