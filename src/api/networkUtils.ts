/**
 * Universal cross-platform fetch utility with timeout and retry support.
 * Works seamlessly on mobile (Hermes / React Native Android & iOS) and Web / PWA.
 */

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
  retries = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try {
        controller.abort();
      } catch {}
    }, timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt === retries) {
        throw err;
      }
      // Brief backoff before retry
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw new Error(`fetchWithTimeout failed after ${retries + 1} attempts`);
}
