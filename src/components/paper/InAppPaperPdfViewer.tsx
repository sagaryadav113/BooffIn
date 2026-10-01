import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { colors, radii, spacing, typography } from '../../theme';
import { Paper } from '../../types';
import { FloatingRatingDock } from './FloatingRatingDock';
import { PaperMetrics, UserPaperRating } from '../../api/hypeScoreService';
import {
  downloadAndCachePdf,
  getCachedPdf,
  clearPdfCache,
} from '../../utils/pdfCacheManager';

export interface InAppPaperPdfViewerProps {
  paper: Paper;
  pdfUrl: string;
  isDirectPdf: boolean;
  isArxivPdf: boolean;
  onSwitchToArticleView?: () => void;
  onRatingUpdated?: (newMetrics: PaperMetrics, userRating: UserPaperRating) => void;
}

// Lightweight HTML viewer powered by Mozilla PDF.js
const PDFJS_VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background-color: #525659;
      width: 100%;
      min-height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 8px 70px;
    }
    #status-bar {
      color: #F3F4F6;
      font-size: 13px;
      text-align: center;
      padding: 30px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #34D399;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #pages-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .page-wrapper {
      background: #FFFFFF;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      border-radius: 3px;
      overflow: hidden;
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    canvas {
      width: 100% !important;
      height: auto !important;
      display: block;
    }
    .page-tag {
      font-size: 11px;
      color: #9CA3AF;
      padding: 5px 0 6px;
      text-align: center;
      background: #FAFAFA;
      width: 100%;
      border-top: 1px solid #F3F4F6;
    }
  </style>
</head>
<body>
  <div id="status-bar">
    <div class="spinner"></div>
    <div id="status-text">Preparing manuscript pages...</div>
  </div>
  <div id="pages-container"></div>

  <script>
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } catch(e) {}

    function updateStatus(text, hideSpinner) {
      var sText = document.getElementById('status-text');
      if (sText) sText.innerText = text;
      if (hideSpinner) {
        var sp = document.querySelector('.spinner');
        if (sp) sp.style.display = 'none';
      }
    }

    function base64ToUint8(base64) {
      var bin = atob(base64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    }

    window._pdfLoaded = false;
    function renderPdfData(base64String) {
      if (window._pdfLoaded) return;
      window._pdfLoaded = true;
      try {
        updateStatus('Rendering PDF pages...', false);
        var bytes = base64ToUint8(base64String);

        pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdfDoc) {
          var container = document.getElementById('pages-container');
          var statusBar = document.getElementById('status-bar');
          if (statusBar) statusBar.style.display = 'none';

          var totalPages = pdfDoc.numPages;

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAGES_LOADED',
              totalPages: totalPages
            }));
          }

          function loadPage(pageNumber) {
            pdfDoc.getPage(pageNumber).then(function(page) {
              var scale = 2.0; // Sharp rendering
              var viewport = page.getViewport({ scale: scale });

              var pageWrap = document.createElement('div');
              pageWrap.className = 'page-wrapper';

              var canvas = document.createElement('canvas');
              var ctx = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              var tag = document.createElement('div');
              tag.className = 'page-tag';
              tag.innerText = 'Page ' + pageNumber + ' of ' + totalPages;

              pageWrap.appendChild(canvas);
              pageWrap.appendChild(tag);
              container.appendChild(pageWrap);

              var renderTask = page.render({
                canvasContext: ctx,
                viewport: viewport
              });

              renderTask.promise.then(function() {
                if (pageNumber < totalPages) {
                  setTimeout(function() {
                    loadPage(pageNumber + 1);
                  }, 20);
                } else {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'ALL_PAGES_RENDERED'
                    }));
                  }
                }
              });
            }).catch(function(pageErr) {
              console.error('Page render error:', pageErr);
            });
          }

          loadPage(1);
        }).catch(function(docErr) {
          updateStatus('Could not render document. Please tap Browser above.', true);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'RENDER_ERROR',
              error: docErr.message || 'Parse error'
            }));
          }
        });
      } catch (err) {
        updateStatus('Error rendering document. Tap Browser to view online.', true);
      }
    }
    window.renderPdfData = renderPdfData;

    // Listen for data from React Native
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data && data.type === 'LOAD_PDF' && data.base64) {
          renderPdfData(data.base64);
        }
      } catch (e) {}
    });

    document.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data && data.type === 'LOAD_PDF' && data.base64) {
          renderPdfData(data.base64);
        }
      } catch (e) {}
    });

    // Notify React Native that viewer shell is ready
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIEWER_READY' }));
    }
  </script>
</body>
</html>`;

export const InAppPaperPdfViewer: React.FC<InAppPaperPdfViewerProps> = ({
  paper,
  pdfUrl,
  isDirectPdf,
  isArxivPdf,
  onSwitchToArticleView,
  onRatingUpdated,
}) => {
  const webViewRef = useRef<WebView>(null);

  // States
  const [renderMode, setRenderMode] = useState<'pdfjs' | 'publisher_web'>('pdfjs');
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Derive the direct PDF stream URL
  const effectiveStreamUrl = useMemo(() => {
    const raw = (pdfUrl || paper.openAccessUrl || paper.canonicalUrl || '').trim();

    // 1. Direct PDF already present
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

  // Fallback publisher web URL if PDF binary is not returned
  const publisherWebUrl = useMemo(() => {
    return (
      paper.canonicalUrl ||
      (paper.doi ? `https://doi.org/${paper.doi}` : '') ||
      paper.openAccessUrl ||
      effectiveStreamUrl
    );
  }, [paper.canonicalUrl, paper.doi, paper.openAccessUrl, effectiveStreamUrl]);

  // Load and cache PDF on mount or reload
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoadingPdf(false);
      return;
    }

    let isMounted = true;
    setIsLoadingPdf(true);
    setErrorMessage(null);
    setDownloadProgress(0);

    const initPdf = async () => {
      try {
        // 1. Check local cache first (instant return, 0 downloads)
        const cached = await getCachedPdf(paper.id);
        if (cached && cached.isPdf && cached.base64) {
          if (isMounted) {
            setPdfBase64(cached.base64);
            setRenderMode('pdfjs');
            setIsLoadingPdf(false);
          }
          return;
        }

        if (!effectiveStreamUrl) {
          if (isMounted) {
            setRenderMode('publisher_web');
            setIsLoadingPdf(false);
          }
          return;
        }

        // 2. Download into app private cache
        const result = await downloadAndCachePdf(
          effectiveStreamUrl,
          paper.id,
          (progress) => {
            if (isMounted) setDownloadProgress(progress);
          }
        );

        if (!isMounted) return;

        if (result.isPdf && result.base64) {
          setPdfBase64(result.base64);
          setRenderMode('pdfjs');
          setIsLoadingPdf(false);
        } else {
          // If direct PDF binary was not returned (e.g. publisher provided HTML article page),
          // seamlessly switch to publisher web reader so the user reads the paper in the window without any fail!
          setRenderMode('publisher_web');
          setIsLoadingPdf(false);
        }
      } catch (err: any) {
        if (isMounted) {
          // Seamless fallback to publisher portal in WebView
          setRenderMode('publisher_web');
          setIsLoadingPdf(false);
        }
      }
    };

    initPdf();

    return () => {
      isMounted = false;
    };
  }, [paper.id, effectiveStreamUrl, reloadTrigger]);

  // Send PDF base64 to WebView once both are ready
  useEffect(() => {
    if (isViewerReady && pdfBase64 && webViewRef.current) {
      const sendPayload = () => {
        try {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'LOAD_PDF',
              base64: pdfBase64,
            })
          );
        } catch {}
      };

      sendPayload();
      const timer = setTimeout(sendPayload, 300);
      return () => clearTimeout(timer);
    }
  }, [isViewerReady, pdfBase64]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'VIEWER_READY') {
        setIsViewerReady(true);
      } else if (data.type === 'PAGES_LOADED') {
        setTotalPages(data.totalPages);
      } else if (data.type === 'RENDER_ERROR') {
        setErrorMessage('Could not render PDF manuscript. Open in Browser below.');
      }
    } catch {}
  }, []);

  const handleOpenExternal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const target =
      effectiveStreamUrl ||
      paper.canonicalUrl ||
      (paper.doi ? `https://doi.org/${paper.doi}` : '');
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

  const handleReload = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await clearPdfCache(paper.id);
    setPdfBase64(null);
    setIsViewerReady(false);
    setTotalPages(null);
    setReloadTrigger((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      {/* ── TOP TOOLBAR ── */}
      <View style={styles.topToolbar}>
        <View style={styles.toolbarLeft}>
          <View style={styles.badgeWrap}>
            <FileText size={12} color="#1B4D3E" />
            <Text style={styles.badgeText}>
              {renderMode === 'publisher_web'
                ? 'Publisher Portal'
                : isArxivPdf
                ? 'arXiv PDF'
                : 'Original PDF'}
            </Text>
          </View>
          <Text style={styles.journalSubtitle} numberOfLines={1}>
            {paper.journal || 'Academic Paper'} {paper.publicationYear ? `· ${paper.publicationYear}` : ''}
            {totalPages ? ` · ${totalPages} pages` : ''}
          </Text>
        </View>

        <View style={styles.toolbarActions}>
          <TouchableOpacity
            style={styles.toolbarIconBtn}
            onPress={handleReload}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCw size={14} color="#4B5563" />
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

      {/* ── VIEWER BODY ── */}
      {Platform.OS === 'web' ? (
        <View style={styles.webPdfWrapper}>
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
          />

          <FloatingRatingDock
            paperId={paper.id}
            paperTitle={paper.title}
            onRatingUpdated={onRatingUpdated}
            style={styles.floatingDockInPdf}
          />
        </View>
      ) : (
        <View style={styles.nativeViewerWrapper}>
          {renderMode === 'pdfjs' ? (
            <>
              {/* PDF.js HTML Canvas Viewer */}
              <WebView
                ref={webViewRef}
                source={{ html: PDFJS_VIEWER_HTML, baseUrl: 'https://localhost' }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mixedContentMode="always"
                originWhitelist={['*']}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                onLoadEnd={() => setIsViewerReady(true)}
                onMessage={handleWebViewMessage}
                showsVerticalScrollIndicator={true}
                bounces={false}
                overScrollMode="never"
              />

              {/* In-App Loading Overlay */}
              {isLoadingPdf && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1B4D3E" />
                  <Text style={styles.loadingTitle}>Opening PDF Manuscript...</Text>
                  <Text style={styles.loadingSubtitle}>
                    {downloadProgress > 0 && downloadProgress < 1
                      ? `Loading pages (${Math.round(downloadProgress * 100)}%)...`
                      : 'Rendering in-app publication view'}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Seamless Publisher Web Reader Inside App Window */}
              <WebView
                ref={webViewRef}
                source={{ uri: publisherWebUrl }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mixedContentMode="always"
                originWhitelist={['*']}
                scalesPageToFit={true}
                allowsInlineMediaPlayback={true}
                nestedScrollEnabled={true}
                userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1B4D3E" />
                    <Text style={styles.loadingTitle}>Opening Publication Reader...</Text>
                    <Text style={styles.loadingSubtitle}>Loading manuscript from publisher</Text>
                  </View>
                )}
                renderError={(errorDomain, errorCode, errorDesc) => (
                  <View style={styles.errorContainer}>
                    <ShieldAlert size={36} color="#DC2626" />
                    <Text style={styles.errorTitle}>Publisher Portal Protected</Text>
                    <Text style={styles.errorDesc}>
                      {errorDesc || 'This publisher requires an external browser session.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.errorPrimaryBtn}
                      onPress={handleOpenExternal}
                      activeOpacity={0.85}
                    >
                      <ExternalLink size={14} color="#FFFFFF" />
                      <Text style={styles.errorPrimaryBtnText}>Open Manuscript in Browser</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </>
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
    backgroundColor: '#525659',
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
    zIndex: 10,
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
    backgroundColor: '#525659',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#525659',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: spacing.xl,
    gap: 8,
    zIndex: 20,
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
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
    marginBottom: 8,
  },
  errorButtonsRow: {
    width: '100%',
    maxWidth: 300,
    gap: 8,
  },
  errorPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B4D3E',
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  errorPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 11,
    borderRadius: radii.md,
  },
  errorSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
