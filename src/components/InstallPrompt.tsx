import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import {
  hasClaimedPassport,
  isInstalled,
  isIos,
  isWithinDismissCooldown,
  markDismissed,
  markInstalled,
} from "@/pwa/installState";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Already installed / running standalone → never prompt again.
    if (isInstalled()) {
      markInstalled();
      return;
    }
    // Only after the owner has claimed a passport on this device.
    if (!hasClaimedPassport()) return;
    if (isWithinDismissCooldown()) return;

    const onInstalled = () => {
      markInstalled();
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    if (isIos()) {
      // iOS Safari has no beforeinstallprompt — show manual Add to Home Screen hint.
      setIosHint(true);
      setVisible(true);
      return () => window.removeEventListener("appinstalled", onInstalled);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    markDismissed();
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") markInstalled();
      else markDismissed();
    } finally {
      setVisible(false);
      setDeferred(null);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-bronze/30 bg-stone-900/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bronze/15">
            {iosHint ? (
              <Share className="h-5 w-5 text-bronze" />
            ) : (
              <Download className="h-5 w-5 text-bronze" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Install
            </p>
            <p className="font-serif text-lg leading-tight text-foreground">
              Install Craft Passport
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Add it to your Home Screen for one-tap access, NFC interactions,
              weather alerts, and care tracking.
            </p>
            {iosHint && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bronze">
                Tap Share → Add to Home Screen
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!iosHint && (
          <button
            onClick={install}
            className="mt-3 h-11 w-full rounded-lg bg-bronze text-sm font-bold text-stone-950 transition active:scale-[0.98]"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
