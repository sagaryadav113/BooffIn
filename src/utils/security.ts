/**
 * BoffIn Security & Input Validation Utilities
 * Enforces safe external link navigation, prevents script protocol injection (XSS),
 * and validates scientific identifiers (DOIs, arXiv IDs).
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Sanitizes external URLs before opening or rendering in Web/Native views.
 * Neutralizes javascript:, data:, vbscript:, and file: scheme execution risks.
 */
export function sanitizeExternalUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Handle standard relative paths or anchors safely if applicable
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
      return trimmed;
    }

    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      console.warn(`[Security] Blocked potentially unsafe URL scheme: ${parsed.protocol}`);
      return null;
    }

    return parsed.href;
  } catch {
    // If URL constructor fails on scheme-less strings, check for domain format
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  }
}

/**
 * Validates whether a given string adheres to standard DOI format (e.g. 10.1038/s41586-020-2649-2)
 */
export function isValidDoi(doi?: string | null): boolean {
  if (!doi || typeof doi !== 'string') return false;
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  return /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i.test(clean);
}

/**
 * Validates standard arXiv identifier format (e.g. 2303.08774 or math.GT/0309136)
 */
export function isValidArxivId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim().replace(/^https?:\/\/arxiv\.org\/abs\//i, '').replace(/^arxiv:/i, '');
  return /^\d{4}\.\d{4,5}(v\d+)?$/i.test(clean) || /^[a-z\-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?$/i.test(clean);
}

/**
 * Sanitizes text content to eliminate dangerous null bytes and excess whitespace
 */
export function sanitizeTextContent(text?: string | null, maxLength: number = 5000): string {
  if (!text || typeof text !== 'string') return '';
  // Remove null characters and control chars except newlines and tabs
  const cleaned = text.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');
  return cleaned.slice(0, maxLength).trim();
}
