import * as FileSystem from 'expo-file-system/legacy';

export interface CachedPdfResult {
  uri: string;
  isPdf: boolean;
  base64?: string;
  error?: string;
}

/**
 * Returns the local temporary cache file path for a paper PDF.
 */
export function getLocalPdfPath(paperId: string): string {
  const sanitized = (paperId || 'paper').replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseDir = FileSystem.cacheDirectory || '';
  return `${baseDir}paper_pdf_${sanitized}.pdf`;
}

/**
 * Checks if a valid cached PDF already exists for the given paper ID.
 * Verifies that the file begins with '%PDF' before returning.
 */
export async function getCachedPdf(paperId: string): Promise<CachedPdfResult | null> {
  try {
    const fileUri = getLocalPdfPath(paperId);
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || info.size === 0) {
      return null;
    }

    // Verify first 100 bytes contain '%PDF'
    const header = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
      position: 0,
      length: 100,
    });

    if (!header.includes('%PDF')) {
      // Stale or bot-challenge response was previously cached, remove it
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      uri: fileUri,
      isPdf: true,
      base64,
    };
  } catch {
    return null;
  }
}

/**
 * Downloads a PDF from a remote URL to the app's cache directory,
 * inspects the content to ensure it's a real PDF (%PDF header), and returns the result.
 */
export async function downloadAndCachePdf(
  url: string,
  paperId: string,
  onProgress?: (progressFraction: number) => void
): Promise<CachedPdfResult> {
  const fileUri = getLocalPdfPath(paperId);

  // 1. Check cache first
  const cached = await getCachedPdf(paperId);
  if (cached) {
    onProgress?.(1);
    return cached;
  }

  // 2. Download from remote URL with browser-like headers
  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
          'Accept': 'application/pdf,application/octet-stream,*/*',
        },
      },
      (downloadProgress) => {
        if (downloadProgress.totalBytesExpectedToWrite > 0 && onProgress) {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          onProgress(Math.min(Math.max(progress, 0), 1));
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) {
      return { uri: '', isPdf: false, error: 'Download failed to produce a file' };
    }

    // 3. Inspect the file header to verify it is an actual PDF binary
    const header = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.UTF8,
      position: 0,
      length: 120,
    });

    const isPdf = header.includes('%PDF');
    if (!isPdf) {
      // The server returned HTML (e.g., bot challenge or publisher landing page)
      // Delete the non-pdf file so it doesn't linger in cache
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
      return {
        uri: result.uri,
        isPdf: false,
        error: 'Publisher returned HTML challenge or webpage instead of PDF binary',
      };
    }

    // 4. Read as base64 for local PDF.js rendering
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      uri: result.uri,
      isPdf: true,
      base64,
    };
  } catch (err: any) {
    return {
      uri: '',
      isPdf: false,
      error: err?.message || 'Failed to download PDF',
    };
  }
}

/**
 * Clears cached PDF for a specific paper or all cached papers.
 */
export async function clearPdfCache(paperId?: string): Promise<void> {
  try {
    if (paperId) {
      const fileUri = getLocalPdfPath(paperId);
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch {}
}
