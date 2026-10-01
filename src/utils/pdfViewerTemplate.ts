/**
 * Generates an HTML document with Mozilla PDF.js for rendering PDF documents
 * inside React Native WebView with pinch-to-zoom, lazy-loaded pages, and floating controls.
 */
export function getPdfViewerHtml(initialBase64?: string): string {
  const initialDataInjection = initialBase64
    ? `window.__INITIAL_PDF_BASE64__ = ${JSON.stringify(initialBase64)};`
    : `window.__INITIAL_PDF_BASE64__ = null;`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>PDF Viewer</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      background-color: #2D3748;
      width: 100%;
      min-height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      overflow-x: hidden;
    }
    #viewer-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 10px 140px 10px;
      gap: 16px;
      width: 100%;
      min-height: 100vh;
    }
    .page-wrapper {
      background: #FFFFFF;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      max-width: 880px;
      position: relative;
      transition: transform 0.15s ease-out;
    }
    canvas {
      width: 100% !important;
      height: auto !important;
      display: block;
    }
    .page-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #94A3B8;
      font-size: 13px;
      width: 100%;
      height: 100%;
      background: #F8FAFC;
    }
    #page-badge {
      position: fixed;
      top: 12px;
      right: 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #F8FAFC;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.15);
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    #loader-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 14px;
      color: #E2E8F0;
      text-align: center;
    }
    .spinner {
      border: 3.5px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      border-top: 3.5px solid #10B981;
      width: 38px;
      height: 38px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .loading-text {
      font-size: 14px;
      font-weight: 600;
      color: #F1F5F9;
    }
    .loading-sub {
      font-size: 12px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div id="page-badge">Loading...</div>
  <div id="viewer-container">
    <div id="loader-box">
      <div class="spinner"></div>
      <div class="loading-text">Rendering PDF Manuscript...</div>
      <div class="loading-sub">Decoding high-resolution document pages</div>
    </div>
  </div>

  <script>
    ${initialDataInjection}

    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    var pdfDocInstance = null;
    var totalPagesCount = 0;
    var defaultAspectRatio = 1.414; // Standard A4 aspect ratio

    function notifyNative(type, payload) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
        }
      } catch (e) {}
    }

    function initPdf(pdfData) {
      var container = document.getElementById('viewer-container');
      var loaderBox = document.getElementById('loader-box');
      var badge = document.getElementById('page-badge');

      if (!pdfjsLib) {
        notifyNative('PDF_ERROR', { error: 'PDF.js library could not be loaded.' });
        return;
      }

      var loadingTask;
      if (typeof pdfData === 'string' && pdfData.startsWith('data:application/pdf;base64,')) {
        var raw = pdfData.replace('data:application/pdf;base64,', '');
        var binary = atob(raw);
        var len = binary.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({ data: bytes });
      } else if (typeof pdfData === 'string' && !pdfData.startsWith('http://') && !pdfData.startsWith('https://') && !pdfData.startsWith('file://')) {
        // Raw base64 string
        var binaryRaw = atob(pdfData);
        var lenRaw = binaryRaw.length;
        var bytesRaw = new Uint8Array(lenRaw);
        for (var j = 0; j < lenRaw; j++) {
          bytesRaw[j] = binaryRaw.charCodeAt(j);
        }
        loadingTask = pdfjsLib.getDocument({ data: bytesRaw });
      } else if (typeof pdfData === 'string') {
        loadingTask = pdfjsLib.getDocument({ url: pdfData, withCredentials: false });
      } else {
        loadingTask = pdfjsLib.getDocument({ data: pdfData });
      }

      loadingTask.promise.then(function(pdfDoc) {
        pdfDocInstance = pdfDoc;
        totalPagesCount = pdfDoc.numPages;

        if (loaderBox && loaderBox.parentNode) {
          loaderBox.parentNode.removeChild(loaderBox);
        }
        badge.innerText = '1 / ' + totalPagesCount;

        notifyNative('PDF_LOADED', { totalPages: totalPagesCount });

        // First determine page 1 aspect ratio
        pdfDoc.getPage(1).then(function(firstPage) {
          var unscaled = firstPage.getViewport({ scale: 1 });
          defaultAspectRatio = unscaled.height / unscaled.width;
          buildPagePlaceholders(pdfDoc, totalPagesCount);
        }).catch(function() {
          buildPagePlaceholders(pdfDoc, totalPagesCount);
        });

      }).catch(function(err) {
        if (loaderBox) {
          loaderBox.innerHTML = '<div style="color:#EF4444;font-size:14px;font-weight:600;">Error Rendering PDF</div><div style="color:#94A3B8;font-size:12px;margin-top:4px;">' + (err.message || 'Corrupt or unsupported format') + '</div>';
        }
        badge.innerText = 'Error';
        notifyNative('PDF_ERROR', { error: err.message || 'Failed to decode PDF' });
      });
    }

    function buildPagePlaceholders(pdfDoc, numPages) {
      var container = document.getElementById('viewer-container');
      var badge = document.getElementById('page-badge');

      for (var pageNum = 1; pageNum <= numPages; pageNum++) {
        (function(num) {
          var wrapper = document.createElement('div');
          wrapper.className = 'page-wrapper';
          wrapper.id = 'page-' + num;
          wrapper.dataset.pageNum = num;

          // Estimate placeholder height from aspect ratio
          var estWidth = Math.min(window.innerWidth - 20, 880);
          wrapper.style.minHeight = Math.round(estWidth * defaultAspectRatio) + 'px';

          var placeholder = document.createElement('div');
          placeholder.className = 'page-placeholder';
          placeholder.innerHTML = '<div class="spinner" style="width:24px;height:24px;border-width:2.5px;"></div><span>Page ' + num + '</span>';
          wrapper.appendChild(placeholder);

          container.appendChild(wrapper);

          // Lazy page rendering using IntersectionObserver
          var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) {
                badge.innerText = num + ' / ' + numPages;
                if (!wrapper.dataset.rendered) {
                  wrapper.dataset.rendered = 'true';
                  renderPageToCanvas(pdfDoc, num, wrapper, placeholder);
                }
              }
            });
          }, { rootMargin: '300px 0px' });

          observer.observe(wrapper);

          // Render first 2 pages immediately
          if (num <= 2 && !wrapper.dataset.rendered) {
            wrapper.dataset.rendered = 'true';
            renderPageToCanvas(pdfDoc, num, wrapper, placeholder);
          }
        })(pageNum);
      }
    }

    function renderPageToCanvas(pdfDoc, pageNum, wrapper, placeholder) {
      pdfDoc.getPage(pageNum).then(function(page) {
        var dpr = Math.min(window.devicePixelRatio || 1.5, 2.5);
        var unscaledViewport = page.getViewport({ scale: 1 });
        var targetWidth = wrapper.clientWidth || Math.min(window.innerWidth - 20, 880);
        var scale = (targetWidth / unscaledViewport.width) * dpr;
        var viewport = page.getViewport({ scale: scale });

        var canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        wrapper.style.minHeight = Math.round(viewport.height / dpr) + 'px';

        var ctx = canvas.getContext('2d');
        var renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        page.render(renderContext).promise.then(function() {
          if (placeholder && placeholder.parentNode === wrapper) {
            wrapper.removeChild(placeholder);
          }
          wrapper.appendChild(canvas);
        }).catch(function(err) {
          console.error('Page render error', err);
        });
      });
    }

    // Message receiver from React Native
    function handleIncomingMessage(event) {
      try {
        var rawData = event.data;
        if (typeof rawData === 'string') {
          var msg = JSON.parse(rawData);
          if (msg.type === 'LOAD_PDF') {
            initPdf(msg.base64 || msg.url);
          }
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleIncomingMessage);
    document.addEventListener('message', handleIncomingMessage);

    // If initial base64 was pre-injected, load immediately
    if (window.__INITIAL_PDF_BASE64__) {
      setTimeout(function() {
        initPdf(window.__INITIAL_PDF_BASE64__);
      }, 50);
    } else {
      // Informs React Native that the viewer shell is mounted and ready for data
      notifyNative('VIEWER_MOUNTED', {});
    }
  </script>
</body>
</html>`;
}
