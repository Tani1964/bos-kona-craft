// Guarded service-worker registration.
// Refuses to register in dev, Lovable previews, iframes, or when ?sw=off.
// In any refused context, unregisters any existing /sw.js registration to
// prevent stale previews from getting "stuck" behind a cached shell.

const APP_SW_URL = "/sw.js";

function isPreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
        return url.endsWith(APP_SW_URL);
      })
      .map((r) => r.unregister()),
  );
}

export async function registerAppSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const inIframe = window.self !== window.top;
  const isDev = !import.meta.env.PROD;
  const refused =
    isDev ||
    inIframe ||
    isPreviewHost(window.location.hostname) ||
    url.searchParams.get("sw") === "off";

  if (refused) {
    await unregisterAppSW();
    return;
  }

  try {
    await navigator.serviceWorker.register(APP_SW_URL, { scope: "/" });
  } catch (err) {
    console.warn("[pwa] sw registration failed", err);
  }
}
