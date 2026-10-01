import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  ExternalLink,
  BookOpen,
  FileText,
  RotateCw,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { colors, radii, spacing } from '../../theme';
import { Paper } from '../../types';
import { FloatingRatingDock } from './FloatingRatingDock';
import { PaperMetrics, UserPaperRating } from '../../api/hypeScoreService';

export interface InAppPaperPdfViewerProps {
  paper: Paper;
  pdfUrl: string;
  isDirectPdf: boolean;
  isArxivPdf: boolean;
  onSwitchToArticleView?: () => void;
  onRatingUpdated?: (newMetrics: PaperMetrics, userRating: UserPaperRating) => void;
}

export const InAppPaperPdfViewer: React.FC<InAppPaperPdfViewerProps> = ({
  paper,
  pdfUrl,
  isDirectPdf,
  isArxivPdf,
  onSwitchToArticleView,
  onRatingUpdated,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [loadKey, setLoadKey] = useState(0);

  // Derive the direct PDF stream URL
  const effectiveStreamUrl = useMemo(() => {
    const raw = (pdfUrl || paper.openAccessUrl || paper.canonicalUrl || '').trim();

    // 1. Direct PDF already present (e.g. Nature .pdf, Frontiers .pdf, ScienceDirect .pdf)
    if (raw.toLowerCase().endsWith('.pdf') || raw.toLowerCase().includes('.pdf')) {
      return raw;
    }

    // 2. arXiv
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

    // 3. bioRxiv / medRxiv
    if (paper.doi && paper.doi.startsWith('10.1101/')) {
      return `https://www.biorxiv.org/content/${paper.doi}.full.pdf`;
    }

    // 4. Nature / Scientific Reports direct PDF fallback from DOI
    if (paper.doi && paper.doi.startsWith('10.1038/')) {
      const articleId = paper.doi.replace(/^10\.1038\//i, '');
      return `https://www.nature.com/articles/${articleId}.pdf`;
    }

    return raw;
  }, [pdfUrl, paper.openAccessUrl, paper.canonicalUrl, paper.doi]);

  // Construct in-app viewer URI:
  // On Android, loading raw .pdf URLs directly causes Android's OS DownloadManager
  // to intercept and download duplicate files into the device Downloads folder, leaving WebView blank.
  // Google Docs Viewer embeds the PDF pages seamlessly inside the WebView without triggering device downloads.
  const viewerUri = useMemo(() => {
    if (!effectiveStreamUrl) return '';

    if (Platform.OS === 'android') {
      const isDirectPdfLike =
        effectiveStreamUrl.toLowerCase().includes('.pdf') ||
        effectiveStreamUrl.toLowerCase().includes('format=pdf') ||
        effectiveStreamUrl.toLowerCase().includes('arxiv.org') ||
        effectiveStreamUrl.toLowerCase().includes('biorxiv.org') ||
        effectiveStreamUrl.toLowerCase().includes('nature.com/articles');
      if (isDirectPdfLike) {
        return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(effectiveStreamUrl)}`;
      }
    }

    return effectiveStreamUrl;
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

  const handleReload = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLoadKey((prev) => prev + 1);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <View style={styles.container}>
      {/* ── IN-APP VIEWER TOP TOOLBAR ── */}
      <View style={styles.topToolbar}>
        <View style={styles.toolbarLeft}>
          <View style={styles.badgeWrap}>
            <FileText size={12} color="#1B4D3E" />
            <Text style={styles.badgeText}>
              {isArxivPdf ? 'arXiv PDF' : 'Original PDF'}
            </Text>
          </View>
          <Text style={styles.journalSubtitle} numberOfLines={1}>
            {paper.journal || 'Academic Paper'} · {paper.publicationYear || ''}
          </Text>
        </View>

        <View style={styles.toolbarActions}>
          <TouchableOpacity
            style={styles.toolbarIconBtn}
            onPress={handleReload}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCw size={15} color="#4B5563" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarActionBtn}
            onPress={handleOpenExternal}
            activeOpacity={0.8}
          >
            <ExternalLink size={13} color="#1B4D3E" />
            <Text style={styles.toolbarActionBtnText}>Browser</Text>
          </TouchableOpacity>

          {onSwitchToArticleView && (
            <TouchableOpacity
              style={styles.articleToggleBtn}
              onPress={onSwitchToArticleView}
              activeOpacity={0.8}
            >
              <BookOpen size={13} color="#FFFFFF" />
              <Text style={styles.articleToggleBtnText}>Article</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── IN-APP VIEWER BODY (WEB IFRAME VS NATIVE EMBEDDED STREAM) ── */}
      {Platform.OS === 'web' ? (
        <View style={styles.webPdfWrapper}>
          <iframe
            key={loadKey}
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
          />

          {/* Floating Rating Dock */}
          <FloatingRatingDock
            paperId={paper.id}
            paperTitle={paper.title}
            onRatingUpdated={onRatingUpdated}
            style={styles.floatingDockInPdf}
          />
        </View>
      ) : (
        <View style={styles.nativeViewerWrapper}>
          {!effectiveStreamUrl ? (
            <View style={styles.emptyContainer}>
              <FileText size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>PDF URL not available</Text>
              <Text style={styles.emptySubtitle}>
                No direct open access link was found for this paper.
              </Text>
              <TouchableOpacity
                style={styles.errorBtn}
                onPress={handleOpenExternal}
                activeOpacity={0.85}
              >
                <ExternalLink size={14} color="#FFFFFF" />
                <Text style={styles.errorBtnText}>Open Canonical Source</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              key={`viewer_${loadKey}`}
              ref={webViewRef}
              source={{ uri: viewerUri }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scalesPageToFit={true}
              allowsInlineMediaPlayback={true}
              nestedScrollEnabled={true}
              mixedContentMode="always"
              originWhitelist={['*']}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1B4D3E" />
                  <Text style={styles.loadingTitle}>Opening PDF Manuscript...</Text>
                  <Text style={styles.loadingSubtitle}>Rendering in-app publication view</Text>
                </View>
              )}
              renderError={(errorDomain, errorCode, errorDesc) => (
                <View style={styles.errorContainer}>
                  <AlertCircle size={32} color="#DC2626" />
                  <Text style={styles.errorTitle}>Could not load inline document</Text>
                  <Text style={styles.errorDesc}>
                    {errorDesc || 'The publisher restricted inline embedding.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.errorBtn}
                    onPress={handleOpenExternal}
                    activeOpacity={0.85}
                  >
                    <ExternalLink size={14} color="#FFFFFF" />
                    <Text style={styles.errorBtnText}>Open in Chrome / Browser</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {/* Floating Rating Dock anchored over PDF */}
          <FloatingRatingDock
            paperId={paper.id}
            paperTitle={paper.title}
            onRatingUpdated={onRatingUpdated}
            style={styles.nativeFloatingDock}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  toolbarLeft: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B4D3E',
  },
  journalSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarIconBtn: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toolbarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toolbarActionBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1B4D3E',
  },
  articleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#1B4D3E',
  },
  articleToggleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webPdfWrapper: {
    flex: 1,
    minHeight: 900,
    backgroundColor: '#525659',
    position: 'relative',
  },
  nativeViewerWrapper: {
    flex: 1,
    minHeight: 650,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  floatingDockInPdf: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  nativeFloatingDock: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    gap: 8,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorDesc: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
    maxWidth: 280,
  },
  errorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B4D3E',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  errorBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
