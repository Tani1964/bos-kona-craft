// Wear intelligence core: inference → potential event → confirmation.
//
// Rules enforced here (not in the UI, not in the push layer):
//   * inference NEVER creates a confirmed wear slot
//   * one real-world outing = one outing_key = at most one confirmed slot
//   * unconfirmed events expire; they are never auto-confirmed
//
// Server-only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getWeather } from "@/lib/weather.server";
import { notifyOwner } from "@/lib/notify/dispatch.server";
import { listOwnedAssetIds } from "@/lib/owner-session.server";

export const POTENTIAL_TTL_HOURS = 12;
const PROMPT_COOLDOWN_MS = 20 * 60 * 60 * 1000; // ask at most ~once a day
const PING_RETENTION_DAYS = 30;
const MIN_PINGS_FOR_HOME = 3;

export type OwnerSettings = {
  owner_phone: string;
  wear_intelligence: boolean;
  notifications_enabled: boolean;
  home_lat: number | null;
  home_lng: number | null;
  home_radius_m: number;
  last_prompt_at: string | null;
};

export async function ensureSettings(phone: string): Promise<OwnerSettings> {
  const { data } = await supabaseAdmin
    .from("owner_settings")
    .select(
      "owner_phone, wear_intelligence, notifications_enabled, home_lat, home_lng, home_radius_m, last_prompt_at",
    )
    .eq("owner_phone", phone)
    .maybeSingle();
  if (data) return data as OwnerSettings;

  const { data: created } = await supabaseAdmin
    .from("owner_settings")
    .insert({ owner_phone: phone })
    .select(
      "owner_phone, wear_intelligence, notifications_enabled, home_lat, home_lng, home_radius_m, last_prompt_at",
    )
    .single();
  return created as OwnerSettings;
}

function metresBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** UTC-day key: repeated departure signals in one day collapse to one outing. */
export function outingKeyFor(when: Date = new Date()): string {
  return `d${when.toISOString().slice(0, 10)}`;
}

/**
 * Learn the owner's usual area from rounded pings. Never an address, never
 * typed by the owner, only the most frequent ~100m bucket of the last 30 days.
 */
async function learnHomeZone(phone: string) {
  const since = new Date(
    Date.now() - PING_RETENTION_DAYS * 86400000,
  ).toISOString();
  const { data: pings } = await supabaseAdmin
    .from("presence_pings")
    .select("lat, lng")
    .eq("owner_phone", phone)
    .gte("observed_at", since);

  if (!pings || pings.length < MIN_PINGS_FOR_HOME) return null;

  const buckets = new Map<string, { lat: number; lng: number; n: number }>();
  for (const p of pings) {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const b = buckets.get(key) ?? { lat: 0, lng: 0, n: 0 };
    b.lat += lat;
    b.lng += lng;
    b.n += 1;
    buckets.set(key, b);
  }
  let best: { lat: number; lng: number; n: number } | null = null;
  for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
  if (!best || best.n < MIN_PINGS_FOR_HOME) return null;

  const home = { lat: best.lat / best.n, lng: best.lng / best.n };
  await supabaseAdmin
    .from("owner_settings")
    .update({ home_lat: home.lat, home_lng: home.lng })
    .eq("owner_phone", phone);
  return home;
}

export type PresenceResult = {
  /** What we actually know — deliberately modest wording for the UI. */
  state:
    | "disabled"
    | "learning" // not enough history to know the usual area yet
    | "home" // inside the usual area
    | "away_recorded" // possible outing recorded as pending
    | "away_existing"; // possible outing for today already on file
  notification?: Awaited<ReturnType<typeof notifyOwner>>["outcome"];
  pending_count?: number;
};

/**
 * Called when the passport is open and location is already permitted.
 * Records a ping, learns the usual area, and — if the owner looks away from it
 * — files a POTENTIAL wear event per owned pair for today's outing.
 */
export async function observePresence(
  phone: string,
  lat: number,
  lng: number,
): Promise<PresenceResult> {
  const settings = await ensureSettings(phone);
  if (!settings.wear_intelligence) return { state: "disabled" };

  await supabaseAdmin
    .from("presence_pings")
    .insert({ owner_phone: phone, lat, lng });

  // prune old pings (cheap, keeps the learned zone recent)
  await supabaseAdmin
    .from("presence_pings")
    .delete()
    .eq("owner_phone", phone)
    .lt(
      "observed_at",
      new Date(Date.now() - PING_RETENTION_DAYS * 86400000).toISOString(),
    );

  let home =
    settings.home_lat != null && settings.home_lng != null
      ? { lat: Number(settings.home_lat), lng: Number(settings.home_lng) }
      : null;
  if (!home) home = await learnHomeZone(phone);
  if (!home) return { state: "learning" };

  const distance = metresBetween(home.lat, home.lng, lat, lng);
  if (distance <= (settings.home_radius_m ?? 900)) return { state: "home" };

  return filePotentialOuting(phone, { lat, lng });
}

/** Create (or reuse) today's potential outing and try to notify about it. */
export async function filePotentialOuting(
  phone: string,
  at?: { lat: number; lng: number },
): Promise<PresenceResult> {
  const settings = await ensureSettings(phone);
  const outingKey = outingKeyFor();
  const assetIds = await listOwnedAssetIds(phone);
  if (assetIds.length === 0) return { state: "learning" };

  const { data: existing } = await supabaseAdmin
    .from("wear_events")
    .select("id, asset_id, status")
    .eq("owner_phone", phone)
    .eq("outing_key", outingKey);

  const existingIds = new Set((existing ?? []).map((e) => e.asset_id));
  // Already handled today (confirmed / rejected / dismissed) → do not re-ask.
  const settled = (existing ?? []).some((e) =>
    ["confirmed", "rejected", "dismissed"].includes(e.status as string),
  );
  if (settled) return { state: "away_existing" };

  let weather: unknown = null;
  let rain: number | null = null;
  if (at) {
    try {
      const w = await getWeather({ lat: at.lat, lng: at.lng });
      weather = w;
      rain = w.rain_prob_3h ?? 0;
    } catch (err) {
      console.error("[wear] weather lookup failed", err);
    }
  }

  const expiresAt = new Date(
    Date.now() + POTENTIAL_TTL_HOURS * 3600000,
  ).toISOString();

  const toInsert = assetIds
    .filter((id) => !existingIds.has(id))
    .map((asset_id) => ({
      asset_id,
      owner_phone: phone,
      status: "potential",
      detected_via: "inference",
      outing_key: outingKey,
      expires_at: expiresAt,
      location_lat: at?.lat ?? null,
      location_lng: at?.lng ?? null,
      weather_snapshot: (weather as never) ?? null,
      rain_probability: rain,
      notification_status: "pending",
    }));

  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin.from("wear_events").insert(toInsert);
    // Unique outing index may race with a parallel tab — harmless.
    if (error && !/duplicate key/i.test(error.message)) {
      console.error("[wear] potential insert failed", error.message);
    }
  }

  const { data: pending } = await supabaseAdmin
    .from("wear_events")
    .select("id, asset_id, assets(model_name)")
    .eq("owner_phone", phone)
    .eq("outing_key", outingKey)
    .in("status", ["potential", "awaiting_confirmation"]);

  const pendingCount = pending?.length ?? 0;
  if (pendingCount === 0) return { state: "away_existing" };

  // Live detection never pushes: the owner is in the app right now, so the
  // in-app card asks. Push for wear/care is reserved for the 7-day fallback.
  void settings;
  await supabaseAdmin
    .from("wear_events")
    .update({ status: "awaiting_confirmation", notification_status: "none" })
    .eq("owner_phone", phone)
    .eq("outing_key", outingKey)
    .in("status", ["potential", "awaiting_confirmation"]);

  return { state: "away_recorded", pending_count: pendingCount };
}

/** Pending prompts the owner still has to answer (fallback experience). */
export async function listPending(phone: string) {
  await expireStale(phone);
  const { data } = await supabaseAdmin
    .from("wear_events")
    .select(
      "id, asset_id, outing_key, started_at, expires_at, rain_probability, weather_snapshot, notification_status, assets(serial, model_name)",
    )
    .eq("owner_phone", phone)
    .in("status", ["potential", "awaiting_confirmation"])
    .order("started_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function expireStale(phone?: string) {
  let q = supabaseAdmin
    .from("wear_events")
    .update({ status: "expired" })
    .in("status", ["potential", "awaiting_confirmation"])
    .lt("expires_at", new Date().toISOString());
  if (phone) q = q.eq("owner_phone", phone);
  const { error } = await q;
  if (error) console.error("[wear] expire sweep failed", error.message);
}

/**
 * The only path that creates a confirmed wear slot.
 * Siblings from the same outing are dismissed so one outing never becomes many.
 */
export async function confirmWear(
  phone: string,
  wearEventId: string,
  transportMode: "walking" | "transit" | "car" = "walking",
) {
  const { data: ev } = await supabaseAdmin
    .from("wear_events")
    .select("id, asset_id, owner_phone, status, outing_key")
    .eq("id", wearEventId)
    .maybeSingle();
  if (!ev || ev.owner_phone !== phone) throw new Error("Event not found");
  if (ev.status === "confirmed") return { ok: true, already: true };

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("wear_events")
    .update({
      status: "confirmed",
      confirmed_at: now,
      detected_via: "prompt",
      transport_mode: transportMode,
      expires_at: null,
    })
    .eq("id", ev.id);
  if (error) throw new Error(error.message);

  if (ev.outing_key) {
    await supabaseAdmin
      .from("wear_events")
      .update({ status: "dismissed" })
      .eq("owner_phone", phone)
      .eq("outing_key", ev.outing_key)
      .neq("id", ev.id)
      .in("status", ["potential", "awaiting_confirmation"]);
  }
  return { ok: true, already: false };
}

export async function answerNo(
  phone: string,
  wearEventId: string,
  scope: "pair" | "outing",
) {
  const { data: ev } = await supabaseAdmin
    .from("wear_events")
    .select("id, owner_phone, outing_key")
    .eq("id", wearEventId)
    .maybeSingle();
  if (!ev || ev.owner_phone !== phone) throw new Error("Event not found");

  if (scope === "outing" && ev.outing_key) {
    await supabaseAdmin
      .from("wear_events")
      .update({ status: "rejected" })
      .eq("owner_phone", phone)
      .eq("outing_key", ev.outing_key)
      .in("status", ["potential", "awaiting_confirmation"]);
  } else {
    await supabaseAdmin
      .from("wear_events")
      .update({ status: "rejected" })
      .eq("id", ev.id);
  }
  return { ok: true };
}

export async function dismissWear(phone: string, wearEventId: string) {
  await supabaseAdmin
    .from("wear_events")
    .update({ status: "dismissed" })
    .eq("id", wearEventId)
    .eq("owner_phone", phone);
  return { ok: true };
}
