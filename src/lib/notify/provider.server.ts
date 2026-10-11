// Provider-agnostic push transport.
//
// The passport's wear logic never imports a vendor SDK — it calls
// `getPushProvider().send(...)`. Swapping FCM for Web Push / APNs means adding
// one adapter here; nothing in the wear-event pipeline changes.
//
// Server-only.

export type PushMessage = {
  title: string;
  body: string;
  /** String-only key/value payload delivered to the client. */
  data?: Record<string, string>;
};

export type PushSendResult = {
  token: string;
  /** `stale` means the token must be removed from storage. */
  outcome: "sent" | "failed" | "stale";
  detail?: string;
};

export type PushProvider = {
  id: string;
  /** False when credentials are missing — callers must fall back in-app. */
  configured: boolean;
  send(tokens: string[], message: PushMessage): Promise<PushSendResult[]>;
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

function fcmProvider(): PushProvider {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.FIREBASE_MESSAGING_API_KEY;
  const configured = !!lovableKey && !!connectionKey;

  return {
    id: "fcm",
    configured,
    async send(tokens, message) {
      if (!configured) {
        return tokens.map((token) => ({
          token,
          outcome: "failed" as const,
          detail: "push provider not configured",
        }));
      }
      const headers = {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey as string,
        "Content-Type": "application/json",
      };

      const results: PushSendResult[] = [];
      for (const token of tokens) {
        try {
          const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: {
                token,
                notification: { title: message.title, body: message.body },
                ...(message.data ? { data: message.data } : {}),
                ...(message.data?.path
                  ? {
                      webpush: {
                        fcm_options: {
                          link: `https://bos-kona-craft.lovable.app${message.data.path}`,
                        },
                      },
                    }
                  : {}),
              },
            }),
          });
          if (res.ok) {
            results.push({ token, outcome: "sent" });
            continue;
          }
          const detail = await res.text();
          console.error(`[push] fcm send failed [${res.status}]: ${detail}`);
          const stale =
            res.status === 404 ||
            (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT/i.test(detail));
          results.push({
            token,
            outcome: stale ? "stale" : "failed",
            detail: `${res.status} ${detail.slice(0, 300)}`,
          });
        } catch (err) {
          console.error("[push] fcm transport error", err);
          results.push({
            token,
            outcome: "failed",
            detail: err instanceof Error ? err.message : "transport error",
          });
        }
      }
      return results;
    },
  };
}

/** Swap/extend adapters here; the rest of the app is provider-blind. */
export function getPushProvider(): PushProvider {
  return fcmProvider();
}
