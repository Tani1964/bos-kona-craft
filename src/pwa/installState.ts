// Small localStorage-backed helpers for install prompt gating.

const CLAIMED_KEY = "bk_passport_claimed";
const INSTALLED_KEY = "bk_installed";
const DISMISS_KEY = "bk_install_dismissed_at";

export const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Marked once a passport has been successfully claimed on this device. */
export function markPassportClaimed() {
  safeSet(CLAIMED_KEY, "1");
}

export function hasClaimedPassport(): boolean {
  return safeGet(CLAIMED_KEY) === "1";
}

/** Sticky: once installed we never prompt again on this device. */
export function markInstalled() {
  safeSet(INSTALLED_KEY, "1");
}

export function isInstalled(): boolean {
  return safeGet(INSTALLED_KEY) === "1" || isStandalone();
}

export function markDismissed() {
  safeSet(DISMISS_KEY, String(Date.now()));
}

export function isWithinDismissCooldown(): boolean {
  const last = Number(safeGet(DISMISS_KEY) || 0);
  return !!last && Date.now() - last < DISMISS_COOLDOWN_MS;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
}
