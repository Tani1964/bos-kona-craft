// Owner-facing wear intelligence RPCs.
//
// Everything here is scoped to the phone in the owner session cookie.
// Inference can only ever create a *pending* event; a confirmed wear slot
// exists only because the owner tapped "Yes".
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getWearState = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone)
      return { owner: false as const, pending: [], settings: null, push: null };

    const { listPending, ensureSettings } = await import("@/lib/wear.server");
    const { getPushProvider } = await import("@/lib/notify/provider.server");
    const [pending, settings] = await Promise.all([
      listPending(phone),
      ensureSettings(phone),
    ]);
    const provider = getPushProvider();
    return {
      owner: true as const,
      pending,
      settings: {
        wear_intelligence: settings.wear_intelligence,
        notifications_enabled: settings.notifications_enabled,
        home_known: settings.home_lat != null && settings.home_lng != null,
      },
      push: { provider: provider.id, configured: provider.configured },
    };
  },
);

/** The owner's own recent messages — what the passport sent and whether it arrived. */
export const listMyNotifications = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) return [];
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("notification_log")
      .select("id, kind, status, created_at, assets(serial, model_name)")
      .eq("owner_phone", phone)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

/** Called at app open when location is already permitted. Never prompts. */
export const observeMyPresence = createServerFn({ method: "POST" })
  .inputValidator((d: { lat: number; lng: number }) =>
    z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) return { state: "disabled" as const };
    const { observePresence } = await import("@/lib/wear.server");
    return observePresence(phone, data.lat, data.lng);
  });

export const confirmMyWear = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; transport_mode?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        transport_mode: z.enum(["walking", "transit", "car"]).default("walking"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) throw new Error("Not signed in");
    const { confirmWear } = await import("@/lib/wear.server");
    return confirmWear(phone, data.id, data.transport_mode);
  });

export const declineMyWear = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; scope?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        scope: z.enum(["pair", "outing"]).default("pair"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) throw new Error("Not signed in");
    const { answerNo } = await import("@/lib/wear.server");
    return answerNo(phone, data.id, data.scope);
  });

export const dismissMyWear = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) throw new Error("Not signed in");
    const { dismissWear } = await import("@/lib/wear.server");
    return dismissWear(phone, data.id);
  });

export const updateWearSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { wear_intelligence?: boolean; notifications_enabled?: boolean }) =>
    z
      .object({
        wear_intelligence: z.boolean().optional(),
        notifications_enabled: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) throw new Error("Not signed in");
    const { ensureSettings } = await import("@/lib/wear.server");
    await ensureSettings(phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      wear_intelligence?: boolean;
      notifications_enabled?: boolean;
    } = {};
    if (data.wear_intelligence !== undefined)
      patch.wear_intelligence = data.wear_intelligence;
    if (data.notifications_enabled !== undefined)
      patch.notifications_enabled = data.notifications_enabled;
    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin
        .from("owner_settings")
        .update(patch)
        .eq("owner_phone", phone);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Register (or refresh) a push token for this owner's device. */
export const registerPushDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; provider?: string; label?: string }) =>
    z
      .object({
        token: z.string().min(16).max(4096),
        provider: z.string().min(2).max(20).default("fcm"),
        label: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getOwnerPhone } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) throw new Error("Not signed in");
    const { ensureSettings } = await import("@/lib/wear.server");
    await ensureSettings(phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_devices").upsert(
      {
        owner_phone: phone,
        provider: data.provider,
        token: data.token,
        device_label: data.label ?? null,
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: "provider,token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Weekly catch-up answers (retroactive wears and/or owner-reported care). */
export const submitMyCatchUp = createServerFn({ method: "POST" })
  .inputValidator((d: { asset_id: string; wear_days?: number | null; care?: boolean | null }) =>
    z
      .object({
        asset_id: z.string().uuid(),
        wear_days: z.number().int().min(0).max(3).nullable().optional(),
        care: z.boolean().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireOwnership } = await import("@/lib/owner-session.server");
    const phone = await requireOwnership(data.asset_id);
    const { submitCatchUp } = await import("@/lib/fallback.server");
    return submitCatchUp(data.asset_id, phone, data.wear_days ?? null, data.care ?? null);
  });

/** Temporary developer hook: push a 7-day fallback case to this owner's phone. */
export const sendMyTestFallback = createServerFn({ method: "POST" })
  .inputValidator((d: { case: number }) =>
    z.object({ case: z.union([z.literal(2), z.literal(3), z.literal(4)]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getOwnerPhone, listOwnedAssetIds } = await import("@/lib/owner-session.server");
    const phone = await getOwnerPhone();
    if (!phone) throw new Error("Not signed in");
    const ids = await listOwnedAssetIds(phone);
    if (ids.length === 0) throw new Error("No passports linked");
    const { sendTestFallback } = await import("@/lib/fallback.server");
    const r = await sendTestFallback(ids[0], phone, data.case as 2 | 3 | 4);
    return { outcome: r.outcome };
  });
