import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeEffectiveStress, getWeather } from "@/lib/weather.server";

// ── Session (lightweight, no OTP) ──────────────────────────────
// Phone match against store-registered ownership_records.owner_phone is the
// only check. Session stores the verified phone in an encrypted cookie.

type OwnerSession = { phone?: string };

function sessionConfig() {
  const password =
    process.env.OWNER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "fallback-dev-only-secret-change-me-please-12345678";
  return {
    password: password.padEnd(32, "0").slice(0, 64),
    name: "bk_owner",
    maxAge: 60 * 60 * 24 * 90,
    cookie: { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" },
  };
}

const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164, e.g. +2348012345678");

// ── Public: claim / login by phone match ──────────────────────

export const claimBySerial = createServerFn({ method: "POST" })
  .inputValidator((d: { serial: string; phone: string }) =>
    z
      .object({
        serial: z.string().min(1).max(64),
        phone: PhoneSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const serial = data.serial.toUpperCase();
    const phone = data.phone;

    // Find asset
    const { data: asset, error: assetErr } = await supabaseAdmin
      .from("assets")
      .select("id, serial")
      .eq("serial", serial)
      .maybeSingle();
    if (assetErr) throw new Error(assetErr.message);
    if (!asset) throw new Error("Serial not found");

    // Find any ownership record for this asset matching this phone
    const { data: own } = await supabaseAdmin
      .from("ownership_records")
      .select("id, owner_phone, acquired_at")
      .eq("asset_id", asset.id)
      .eq("owner_phone", phone)
      .order("acquired_at", { ascending: false })
      .limit(1);

    if (!own || own.length === 0) {
      // Check if a more recent ownership transfer happened to another phone
      throw new Error(
        "This phone number does not match the registered owner for this passport.",
      );
    }

    // Immediate-transfer rule: confirm this phone is still the LATEST owner
    const { data: latest } = await supabaseAdmin
      .from("ownership_records")
      .select("owner_phone")
      .eq("asset_id", asset.id)
      .order("acquired_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.owner_phone && latest.owner_phone !== phone) {
      throw new Error("Ownership has been transferred. Access revoked.");
    }

    const session = await useSession<OwnerSession>(sessionConfig());
    await session.update({ phone });

    return { ok: true, asset_id: asset.id, serial: asset.serial };
  });

export const logoutOwner = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<OwnerSession>(sessionConfig());
  await session.clear();
  return { ok: true };
});

export const getOwnerContext = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<OwnerSession>(sessionConfig());
  return { phone: session.data.phone ?? null };
});

// Internal helper: confirm current session owns the asset (latest record match)
async function requireOwnership(assetId: string) {
  const session = await useSession<OwnerSession>(sessionConfig());
  const phone = session.data.phone;
  if (!phone) throw new Error("Not signed in");
  const { data: latest } = await supabaseAdmin
    .from("ownership_records")
    .select("owner_phone")
    .eq("asset_id", assetId)
    .order("acquired_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest || latest.owner_phone !== phone) {
    // Transfer happened — kill session
    await session.clear();
    throw new Error("Ownership has been transferred. Access revoked.");
  }
  return phone;
}

// ── Owner: list owned assets ──────────────────────────────────

export const listMyAssets = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<OwnerSession>(sessionConfig());
  const phone = session.data.phone;
  if (!phone) return { phone: null, assets: [] };

  // Get all assets where THIS phone is the LATEST owner.
  const { data: rows } = await supabaseAdmin
    .from("ownership_records")
    .select("asset_id, owner_phone, acquired_at, assets(serial, model_name, status)")
    .order("acquired_at", { ascending: false });

  const seen = new Set<string>();
  const owned: any[] = [];
  for (const r of rows ?? []) {
    if (seen.has(r.asset_id)) continue;
    seen.add(r.asset_id);
    if (r.owner_phone === phone) owned.push(r);
  }
  return { phone, assets: owned };
});

// Current open wear event for this asset (if owner is signed in & owns it).
export const getOpenWearEvent = createServerFn({ method: "GET" })
  .inputValidator((d: { asset_id: string }) =>
    z.object({ asset_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const session = await useSession<OwnerSession>(sessionConfig());
    const phone = session.data.phone;
    if (!phone) return { owner: false as const, event: null };
    // verify still latest owner
    const { data: latest } = await supabaseAdmin
      .from("ownership_records")
      .select("owner_phone")
      .eq("asset_id", data.asset_id)
      .order("acquired_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest || latest.owner_phone !== phone) {
      return { owner: false as const, event: null };
    }
    const { data: ev } = await supabaseAdmin
      .from("wear_events")
      .select("id, started_at, transport_mode, rain_probability, weather_snapshot")
      .eq("asset_id", data.asset_id)
      .eq("owner_phone", phone)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { owner: true as const, event: ev ?? null };
  });

// ── Wear events ───────────────────────────────────────────────

export const createWearEvent = createServerFn({ method: "POST" })
  .inputValidator((d: {
    asset_id: string;
    lat: number;
    lng: number;
    transport_mode: "walking" | "transit" | "car";
  }) =>
    z
      .object({
        asset_id: z.string().uuid(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        transport_mode: z.enum(["walking", "transit", "car"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const phone = await requireOwnership(data.asset_id);

    let weather: any = null;
    let rain = 0;
    try {
      weather = await getWeather({ lat: data.lat, lng: data.lng });
      rain = weather?.rain_prob_3h ?? 0;
    } catch (err) {
      console.error("weather fetch failed", err);
    }

    const { data: ev, error } = await supabaseAdmin
      .from("wear_events")
      .insert({
        asset_id: data.asset_id,
        owner_phone: phone,
        transport_mode: data.transport_mode,
        location_lat: data.lat,
        location_lng: data.lng,
        weather_snapshot: weather,
        rain_probability: rain,
      })
      .select("id, started_at")
      .single();
    if (error) throw new Error(error.message);

    if (rain > 0.4 && weather) {
      await supabaseAdmin.from("care_insights").insert({
        asset_id: data.asset_id,
        owner_phone: phone,
        kind: "pre_wear_trigger",
        body: `Rain likely in the next few hours (${Math.round(rain * 100)}%). Consider AirForm or your weather pair.`,
        source_ref: { wear_event_id: ev.id, weather },
      });
    }

    return { id: ev.id, started_at: ev.started_at, weather, rain_probability: rain };
  });

export const closeWearEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { wear_event_id: string }) =>
    z.object({ wear_event_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: ev, error } = await supabaseAdmin
      .from("wear_events")
      .select("id, asset_id, owner_phone, started_at, ended_at, rain_probability, weather_snapshot, transport_mode")
      .eq("id", data.wear_event_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ev) throw new Error("Event not found");
    await requireOwnership(ev.asset_id);
    if (ev.ended_at) return { ok: true, already_closed: true };

    const endedAt = new Date();
    const durationHours = Math.max(
      0,
      (endedAt.getTime() - new Date(ev.started_at).getTime()) / (1000 * 60 * 60),
    );
    const weather = (ev.weather_snapshot as any) ?? { rain_prob_3h: 0, humidity: 0 };
    const stress = computeEffectiveStress({
      weather,
      durationHours,
      transportMode: ev.transport_mode as "walking" | "transit" | "car",
    });

    await supabaseAdmin
      .from("wear_events")
      .update({ ended_at: endedAt.toISOString(), effective_stress: stress })
      .eq("id", ev.id);

    if ((ev.rain_probability ?? 0) > 0.4) {
      await supabaseAdmin.from("care_insights").insert({
        asset_id: ev.asset_id,
        owner_phone: ev.owner_phone,
        kind: "post_wear",
        body: "Rain exposure detected on this wear. Air-dry away from heat and brush off any residue.",
        source_ref: { wear_event_id: ev.id },
      });
    }

    return { ok: true, effective_stress: stress, duration_hours: durationHours };
  });

// ── Care insights ─────────────────────────────────────────────

export const listInsights = createServerFn({ method: "GET" })
  .inputValidator((d: { asset_id: string }) =>
    z.object({ asset_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const phone = await requireOwnership(data.asset_id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("care_insights")
      .select("id, kind, body, created_at, shown_at")
      .eq("asset_id", data.asset_id)
      .eq("owner_phone", phone)
      .gte("created_at", sevenDaysAgo)
      .is("shown_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    return { insight: rows?.[0] ?? null };
  });

export const dismissInsight = createServerFn({ method: "POST" })
  .inputValidator((d: { insight_id: string }) =>
    z.object({ insight_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await supabaseAdmin
      .from("care_insights")
      .update({ shown_at: new Date().toISOString() })
      .eq("id", data.insight_id);
    return { ok: true };
  });
