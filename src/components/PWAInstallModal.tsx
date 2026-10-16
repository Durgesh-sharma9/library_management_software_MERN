import React from 'react';
import {
  Download,
  X,
  Smartphone,
  Laptop,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Zap,
  WifiOff,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { usePWA } from '../context/PWAContext';

export const PWAInstallModal: React.FC = () => {
  const {
    showInstallModal,
    closeInstallModal,
    isInstalled,
    isInstallable,
    isIOS,
    promptInstall,
  } = usePWA();

  if (!showInstallModal) return null;

  return (
    <div
      id="pwa-install-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
      onClick={closeInstallModal}
    >
      <div
        id="pwa-install-modal-content"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon / Banner */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-indigo-900 via-indigo-700 to-purple-800 text-white overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={closeInstallModal}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lg shadow-indigo-950/40 ring-4 ring-white/20 shrink-0 flex items-center justify-center">
              <img
                src="/icons/icon.svg"
                alt="LibraFlow App Icon"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-300/30 text-[10px] font-bold text-indigo-100 uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Progressive Web App (PWA)</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                Download LibraFlow App
              </h2>
              <p className="text-xs text-indigo-100/90 font-medium mt-0.5">
                Install as a standalone native app on Windows, Mac, Android & iOS
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Status Message */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  LibraFlow is Already Installed!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  You are already running LibraFlow as an installed desktop or mobile application with offline capabilities.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Key Features Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Instant Launch</h5>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      Opens directly from desktop or home screen
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Offline Caching</h5>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      Fast load times even with poor internet
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Zero Browser Clutter</h5>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      Distraction-free full-screen interface
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Automatic Updates</h5>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      Always runs the latest secure version
                    </p>
                  </div>
                </div>
              </div>

              {/* Native Prompt Trigger Button (Chrome/Edge/Android) */}
              {(isInstallable || (typeof window !== 'undefined' && !!(window as any).__pwaDeferredPrompt)) && (
                <button
                  type="button"
                  onClick={async () => {
                    await promptInstall();
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 animate-bounce" />
                  <span>Install App to This Device (1-Click)</span>
                </button>
              )}

              {/* Instructions Guides for iOS or Desktop browser when native prompt is not active */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    {isIOS ? (
                      <>
                        <Smartphone className="w-4 h-4 text-indigo-600" />
                        <span>iOS / Safari Installation Guide</span>
                      </>
                    ) : (
                      <>
                        <Laptop className="w-4 h-4 text-indigo-600" />
                        <span>Manual Installation Guide</span>
                      </>
                    )}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold">Easy 3-step setup</span>
                </div>

                {isIOS ? (
                  /* iOS / Safari Steps */
                  <ol className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span>
                        Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-indigo-600 -mt-0.5" /> in the Safari toolbar (bottom on iPhone, top on iPad).
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span>
                        Scroll down the menu and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-600 -mt-0.5" />.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span>
                        Tap <strong>Add</strong> in the top-right corner. The LibraFlow icon is now ready on your home screen!
                      </span>
                    </li>
                  </ol>
                ) : (
                  /* Chrome / Edge / Desktop Steps */
                  <ol className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span>
                        Look at the right end of your browser's address bar for the <strong>Install</strong> or <strong>Computer/Download icon</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span>
                        Alternatively, click the browser menu (<strong>⋮</strong> in Chrome or <strong>…</strong> in Edge) and select <strong>"Install LibraFlow ERP"</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span>
                        Click <strong>Install</strong>. LibraFlow will launch in its own standalone window with taskbar & desktop shortcuts.
                      </span>
                    </li>
                  </ol>
                )}
              </div>
            </>
          )}

          {/* Footer close action */}
          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={closeInstallModal}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
