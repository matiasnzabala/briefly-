"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "briefly:install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint] = useState(() => typeof window !== "undefined" && isIos());
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return false;
    if (isStandalone()) return false;
    return isIos();
  });

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (isStandalone()) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl p-4 flex items-center gap-3 shadow-lg"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <span className="text-2xl shrink-0">📲</span>
      <div className="flex-1 text-sm">
        {showIosHint ? (
          <p>
            Agregá Briefly a tu pantalla de inicio: tocá{" "}
            <span aria-hidden>⎙</span> Compartir y luego &quot;Agregar a inicio&quot;.
          </p>
        ) : (
          <p>Instalá Briefly en tu pantalla de inicio para acceso rápido.</p>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {!showIosHint && (
          <button
            onClick={install}
            className="px-3 py-1 rounded-lg text-sm font-medium"
            style={{ background: "var(--accent, #3b82f6)", color: "#fff" }}
          >
            Instalar
          </button>
        )}
        <button onClick={dismiss} className="px-3 py-1 rounded-lg text-sm opacity-70">
          Cerrar
        </button>
      </div>
    </div>
  );
}
