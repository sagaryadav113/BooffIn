/**
 * Global Polyfills for React Native (Hermes / JSC)
 *
 * Polyfills web platform features that are missing in React Native's JS environment,
 * preventing 'TypeError: AbortSignal.timeout is not a function' in mobile APK builds.
 */

if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout !== 'function') {
  (AbortSignal as any).timeout = function (ms: number): AbortSignal {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new Error(`TimeoutError: Request timed out after ${ms}ms`));
      } catch {}
    }, ms);

    if (controller.signal.addEventListener) {
      controller.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeoutId);
        },
        { once: true }
      );
    }

    return controller.signal;
  };
}
