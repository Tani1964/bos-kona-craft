// Browser-side push registration. Firebase is one adapter, deliberately
// isolated here so the rest of the passport never imports a vendor SDK.

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" };

const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as
  | string
  | undefined;
const vapidKey = import.meta.env[
  "VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"
] as string | undefined;

const firebaseConfig = {
  apiKey: import.meta.env[
    "VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"
  ] as string | undefined,
  projectId: import.meta.env[
    "VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"
  ] as string | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export function pushConfigured() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    appId &&
    vapidKey &&
    firebaseConfig.messagingSenderId
  );
}

export async function enablePush(): Promise<PushResult> {
  if (!pushConfigured()) return { status: "not-configured" };
  if (typeof window === "undefined" || !("Notification" in window))
    return { status: "unsupported" };

  const { initializeApp } = await import("firebase/app");
  const { getMessaging, getToken, isSupported } = await import(
    "firebase/messaging"
  );
  if (!(await isSupported())) return { status: "unsupported" };
  if (window.top !== window.self) return { status: "open-in-new-tab" };

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const query = new URLSearchParams(
    firebaseConfig as Record<string, string>,
  ).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
  const messaging = getMessaging(initializeApp(firebaseConfig as any));
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
  return token ? { status: "registered", token } : { status: "denied" };
}
