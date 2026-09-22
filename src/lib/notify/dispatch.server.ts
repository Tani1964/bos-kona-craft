// Craft Passport Notification Service.
//
// Owns: who to reach, token hygiene, logging, and honest reporting of whether
// delivery was even possible. Knows nothing about *why* a notification exists.
//
// Server-only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPushProvider, type PushMessage } from "./provider.server";

export type DispatchOutcome =
  | "sent"
  | "failed"
  | "unavailable" // no provider credentials
  | "no_devices" // owner never registered a device (or turned notifications off)
  | "opted_out";

export type DispatchContext = {
  ownerPhone: string;
  kind: string;
  assetId?: string | null;
  wearEventId?: string | null;
};

async function log(
  ctx: DispatchContext,
  provider: string,
  status: string,
  detail?: string,
) {
  await supabaseAdmin.from("notification_log").insert({
    owner_phone: ctx.ownerPhone,
    asset_id: ctx.assetId ?? null,
    wear_event_id: ctx.wearEventId ?? null,
    kind: ctx.kind,
    provider,
    status,
    detail: detail ?? null,
  });
}

export async function notifyOwner(
  ctx: DispatchContext,
  message: PushMessage,
): Promise<{ outcome: DispatchOutcome; provider: string }> {
  const provider = getPushProvider();

  const { data: settings } = await supabaseAdmin
    .from("owner_settings")
    .select("notifications_enabled")
    .eq("owner_phone", ctx.ownerPhone)
    .maybeSingle();
  if (settings && settings.notifications_enabled === false) {
    await log(ctx, provider.id, "opted_out");
    return { outcome: "opted_out", provider: provider.id };
  }

  if (!provider.configured) {
    await log(ctx, provider.id, "unavailable", "provider not configured");
    return { outcome: "unavailable", provider: provider.id };
  }

  const { data: devices } = await supabaseAdmin
    .from("push_devices")
    .select("id, token")
    .eq("owner_phone", ctx.ownerPhone)
    .eq("provider", provider.id)
    .is("revoked_at", null);

  const tokens = (devices ?? []).map((d) => d.token);
  if (tokens.length === 0) {
    await log(ctx, provider.id, "no_devices");
    return { outcome: "no_devices", provider: provider.id };
  }

  const results = await provider.send(tokens, message);

  const stale = results.filter((r) => r.outcome === "stale").map((r) => r.token);
  if (stale.length > 0) {
    await supabaseAdmin
      .from("push_devices")
      .update({ revoked_at: new Date().toISOString() })
      .in("token", stale);
  }

  const anySent = results.some((r) => r.outcome === "sent");
  const status = anySent ? "sent" : "failed";
  await log(
    ctx,
    provider.id,
    status,
    anySent ? undefined : results.map((r) => r.detail).filter(Boolean).join(" | "),
  );
  return { outcome: anySent ? "sent" : "failed", provider: provider.id };
}
