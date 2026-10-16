import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isOnline: boolean;
  promptInstall: () => Promise<boolean>;
  showInstallModal: boolean;
  setShowInstallModal: (show: boolean) => void;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  swRegistration: ServiceWorkerRegistration | null;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return typeof window !== 'undefined' ? (window as any).__pwaDeferredPrompt || null : null;
  });
  const [isInstallable, setIsInstallable] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? !!(window as any).__pwaDeferredPrompt : false;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if running in standalone mode (already installed as PWA)
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneNav = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const installed = isStandaloneMedia || isStandaloneNav || isAndroidApp;
      setIsInstalled(installed);
    };

    checkStandalone();

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync with early captured prompt if available
    if ((window as any).__pwaDeferredPrompt) {
      setDeferredPrompt((window as any).__pwaDeferredPrompt);
      setIsInstallable(true);
    }

    const handleDeferredPromptReady = () => {
      if ((window as any).__pwaDeferredPrompt) {
        setDeferredPrompt((window as any).__pwaDeferredPrompt);
        setIsInstallable(true);
      }
    };
    window.addEventListener('pwa-deferred-prompt-ready', handleDeferredPromptReady);

    // Listen for beforeinstallprompt event directly
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as any).__pwaDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      (window as any).__pwaDeferredPrompt = null;
      setShowInstallModal(false);
      console.log('🎉 LibraFlow PWA was installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          setSwRegistration(registration);
          console.log('✅ Service Worker registered with scope:', registration.scope);

          // Check for worker updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('🔄 New PWA update available.');
                  } else {
                    console.log('⚡ Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('⚠️ Service Worker registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-deferred-prompt-ready', handleDeferredPromptReady);
    };
  }, []);

  // Trigger installation prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    const prompt = deferredPrompt || (window as any).__pwaDeferredPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          (window as any).__pwaDeferredPrompt = null;
          setShowInstallModal(false);
          return true;
        }
        return false;
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    }

    // Only fallback to guided modal if the browser has no native install prompt available (e.g. iOS Safari)
    setShowInstallModal(true);
    return false;
  }, [deferredPrompt]);

  const openInstallModal = useCallback(() => setShowInstallModal(true), []);
  const closeInstallModal = useCallback(() => setShowInstallModal(false), []);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        isOnline,
        promptInstall,
        showInstallModal,
        setShowInstallModal,
        openInstallModal,
        closeInstallModal,
        swRegistration,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
