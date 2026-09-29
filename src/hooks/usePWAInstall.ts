import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

export interface PWAInstallState {
  isWeb: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isDesktop: boolean;
  hasNativePrompt: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const isWeb = Platform.OS === 'web';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [hasNativePrompt, setHasNativePrompt] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Platform and browser detections
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [isChrome, setIsChrome] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined' || typeof navigator === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }

    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const android = /Android/i.test(ua);
    const safari = /^((?!chrome|android).)*safari/i.test(ua);
    const chrome = /Chrome|CriOS/i.test(ua);
    const desktop = !ios && !android;

    setIsIOS(ios);
    setIsAndroid(android);
    setIsSafari(safari);
    setIsChrome(chrome);
    setIsDesktop(desktop);

    // Check if already launched in standalone PWA mode
    const checkStandalone = () => {
      try {
        const isStandaloneMode =
          (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
          (window.navigator as any)?.standalone === true ||
          (typeof document !== 'undefined' && typeof document.referrer === 'string' && document.referrer.includes('android-app://'));
        setIsInstalled(Boolean(isStandaloneMode));
      } catch {
        setIsInstalled(false);
      }
    };

    checkStandalone();

    // Listen for beforeinstallprompt event (Chromium based browsers)
    const handleBeforeInstallPrompt = (e: any) => {
      try {
        e.preventDefault();
        setDeferredPrompt(e);
        setHasNativePrompt(true);
      } catch {}
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setHasNativePrompt(false);
    };

    try {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    } catch {}

    return () => {
      try {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      } catch {}
    };
  }, [isWeb]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setHasNativePrompt(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  return {
    isWeb,
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isDesktop,
    hasNativePrompt,
    canInstall: isWeb && !isInstalled,
    promptInstall,
  };
}
