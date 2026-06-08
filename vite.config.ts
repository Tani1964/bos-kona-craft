// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        // Caching policy (per phase-4 decision):
        //  - HTML navigations + passport JSON (mutable)  → NetworkFirst
        //  - Hashed JS/CSS (immutable)                   → precache (CacheFirst)
        //  - Images / video (same-origin)                → CacheFirst, capped
        //  - Server fn RPCs, auth, OAuth                 → NetworkOnly (never cached)
        registerType: "autoUpdate",
        injectRegister: null, // our guarded wrapper is the sole registrar
        filename: "sw.js",
        devOptions: { enabled: false },
        // Manifest already lives at /public/manifest.webmanifest — don't regenerate.
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,woff2}"],
          navigateFallback: null, // SSR — don't serve a stale shell
          navigateFallbackDenylist: [
            /^\/~oauth/,
            /^\/api\//,
            /^\/_serverFn\//,
          ],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            // 1. HTML document navigations — always try network, fall back to cached shell.
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-nav",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            // 2. Server function RPC + Supabase + auth — never cache.
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/_serverFn/") ||
                url.pathname.startsWith("/api/") ||
                url.hostname.endsWith(".supabase.co"),
              handler: "NetworkOnly",
            },
            // 3. Same-origin images — cache-first, 7-day max, 80 entries.
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "img",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            // 4. Same-origin video — cache-first, 30-day max, 12 entries (large files).
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && request.destination === "video",
              handler: "CacheFirst",
              options: {
                cacheName: "video",
                rangeRequests: true,
                expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            // 5. Google Fonts CSS — stale-while-revalidate.
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "gfonts-css" },
            },
            // 6. Google Fonts files — cache-first, 1 year.
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "gfonts-files",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
  },
});
