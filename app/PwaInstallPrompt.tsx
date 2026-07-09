"use client";

import { Download, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const dismissedKey = "coffee-dex-pwa-install-dismissed";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    registerServiceWorker();

    if (hasDismissedInstallPrompt() || isStandaloneApp()) return;

    const mobileViewport = window.matchMedia("(max-width: 760px)");
    const updateMobileVisibility = () => {
      if (!mobileViewport.matches) {
        setIsVisible(false);
        return;
      }

      if (isIosDevice()) {
        setShowIosGuide(true);
        setIsVisible(true);
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!mobileViewport.matches || isStandaloneApp()) return;

      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowIosGuide(false);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      rememberDismissedInstallPrompt();
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    updateMobileVisibility();
    mobileViewport.addEventListener("change", updateMobileVisibility);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mobileViewport.removeEventListener("change", updateMobileVisibility);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const closePrompt = () => {
    rememberDismissedInstallPrompt();
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  const installApp = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);

    if (choice?.outcome) rememberDismissedInstallPrompt();

    setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible || (!deferredPrompt && !showIosGuide)) return null;

  return (
    <div className="pwa-install-prompt" role="status">
      <div className="pwa-install-icon" aria-hidden="true">
        {showIosGuide ? <Share2 size={17} strokeWidth={2} /> : <Smartphone size={17} strokeWidth={2} />}
      </div>
      <div className="pwa-install-copy">
        <div className="pwa-install-title">桌面入口已就绪</div>
        <div className="pwa-install-text">
          {showIosGuide ? "在 Safari 里点分享，再选添加到主屏幕。" : "把 Coffee-Dex 安装到手机桌面，打开时像 App 一样。"}
        </div>
      </div>
      {deferredPrompt && (
        <button type="button" className="pwa-install-action" onClick={installApp} aria-label="安装到桌面">
          <Download size={15} strokeWidth={2.2} />
          <span>安装</span>
        </button>
      )}
      <button type="button" className="pwa-install-close" onClick={closePrompt} aria-label="关闭桌面安装提示">
        <X size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const canRegister = window.location.protocol === "https:" || window.location.hostname === "localhost";
  if (!canRegister) return;

  const register = () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  };

  if (document.readyState === "complete") {
    register();
    return;
  }

  window.addEventListener("load", register, { once: true });
}

function hasDismissedInstallPrompt() {
  try {
    return window.localStorage.getItem(dismissedKey) === "true";
  } catch {
    return false;
  }
}

function rememberDismissedInstallPrompt() {
  try {
    window.localStorage.setItem(dismissedKey, "true");
  } catch {
    // Ignore storage failures in private browsing modes.
  }
}

function isStandaloneApp() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
