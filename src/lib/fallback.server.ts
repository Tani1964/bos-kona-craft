// 7-day Wear/Care fallback engine. Push is only sent when the owner has gone
// a week without logging wear and/or care for a pair. Server-only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyOwner } from "@/lib/notify/dispatch.server";
import { FALLBACK_TYPES } from "@/lib/notify/types";
import { decideFallback, fallbackMessage, type CatchUpMode } from "@/lib/fallback";
import { outingKeyFor } from "@/lib/wear.server";

const WEEK_MS = 7 * 86400000;

export async function weeklyCounts(assetId: string, phone: string) {
  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const [w, c] = await Promise.all([
    supabaseAdmin
      .from("wear_events")
      .select("id", { count: "exact", head: true })
      .eq("asset_id", assetId)
      .eq("owner_phone", phone)
      .eq("status", "confirmed")
      .gte("started_at", since),
    supabaseAdmin
      .from("care_sessions")
      .select("id", { count: "exact", head: true })
      .eq("asset_id", assetId)
      .eq("owner_phone", phone)
      .gte("started_at", since),
  ]);
  return { wear: w.count ?? 0, care: c.count ?? 0 };
}

async function sendFallback(
  assetId: string,
  phone: string,
  type: "care_nudge" | "wear_nudge" | "weekly_combined_nudge",
  mode: CatchUpMode,
  test = false,
) {
  const { data: asset } = await supabaseAdmin
    .from("assets")
    .select("serial, model_name")
    .eq("id", assetId)
    .maybeSingle();
  const shoe = asset?.model_name ?? "your pair";
  const msg = fallbackMessage(type, shoe);
  const path = asset?.serial ? `/p/${asset.serial}?catchup=${mode}` : "/me";
  return notifyOwner(
    { ownerPhone: phone, kind: type, assetId },
    { ...msg, data: { path, catchup: mode, ...(test ? { test: "1" } : {}) } },
  );
}

/** Evaluate one pair; sends at most one fallback per pair per 7 days. */
export async function evaluateFallback(assetId: string, phone: string) {
  const counts = await weeklyCounts(assetId, phone);
  const decision = decideFallback(counts.wear, counts.care);
  if (decision.type === null) return { case: 1, sent: false };

  const { data: recent } = await supabaseAdmin
    .from("notification_log")
    .select("id")
    .eq("owner_phone", phone)
    .eq("asset_id", assetId)
    .in("kind", FALLBACK_TYPES)
    .gte("created_at", new Date(Date.now() - WEEK_MS).toISOString())
    .limit(1)
    .maybeSingle();
  if (recent) return { case: decision.case, sent: false, reason: "cooldown" };

  const r = await sendFallback(assetId, phone, decision.type, decision.mode);
  return { case: decision.case, sent: r.outcome === "sent", outcome: r.outcome };
}

/** Cron pass: every pair owned for at least 7 days. */
export async function runFallbackPass() {
  const { data: rows } = await supabaseAdmin
    .from("ownership_records")
    .select("asset_id, owner_phone, acquired_at")
    .order("acquired_at", { ascending: false });
  const seen = new Set<string>();
  const results: Record<string, number> = { evaluated: 0, sent: 0 };
  for (const r of rows ?? []) {
    if (seen.has(r.asset_id)) continue;
    seen.add(r.asset_id);
    if (!r.owner_phone) continue;
    if (Date.now() - new Date(r.acquired_at).getTime() < WEEK_MS) continue;
    try {
      const out = await evaluateFallback(r.asset_id, r.owner_phone);
      results.evaluated++;
      if (out.sent) results.sent++;
    } catch (e) {
      console.error("[fallback] evaluate failed", r.asset_id, e);
    }
  }
  return results;
}

/** Developer hook: force a case for one owner's pair, ignoring cooldown. */
export async function sendTestFallback(assetId: string, phone: string, c: 2 | 3 | 4) {
  const map = {
    2: ["care_nudge", "care"],
    3: ["wear_nudge", "wear"],
    4: ["weekly_combined_nudge", "combined"],
  } as const;
  const [type, mode] = map[c];
  return sendFallback(assetId, phone, type, mode, true);
}

/** Retroactive catch-up from the weekly card. Resets the 7-day timers. */
export async function submitCatchUp(
  assetId: string,
  phone: string,
  wearDays: number | null,
  care: boolean | null,
) {
  let wearsLogged = 0;
  if (wearDays && wearDays > 0) {
    const days = Math.min(3, wearDays);
    const { data: existing } = await supabaseAdmin
      .from("wear_events")
      .select("outing_key, status")
      .eq("asset_id", assetId)
      .eq("owner_phone", phone)
      .gte("started_at", new Date(Date.now() - WEEK_MS).toISOString());
    const confirmedKeys = new Set(
      (existing ?? []).filter((e) => e.status === "confirmed").map((e) => e.outing_key),
    );
    const takenKeys = new Set((existing ?? []).map((e) => e.outing_key));
    // Spread across the last week, newest first, skipping days already worn.
    for (let back = 1; back <= 7 && wearsLogged < days; back++) {
      const day = new Date(Date.now() - back * 86400000);
      day.setUTCHours(12, 0, 0, 0);
      const key = outingKeyFor(day);
      if (confirmedKeys.has(key)) continue;
      if (takenKeys.has(key)) {
        await supabaseAdmin
          .from("wear_events")
          .update({ status: "confirmed", detected_via: "manual", expires_at: null })
          .eq("asset_id", assetId)
          .eq("owner_phone", phone)
          .eq("outing_key", key);
      } else {
        const { error } = await supabaseAdmin.from("wear_events").insert({
          asset_id: assetId,
          owner_phone: phone,
          started_at: day.toISOString(),
          ended_at: day.toISOString(),
          status: "confirmed",
          detected_via: "manual",
          outing_key: key,
        });
        if (error) {
          console.error("[catchup] wear insert", error.message);
          continue;
        }
      }
      wearsLogged++;
    }
  }

  let careLogged = false;
  if (care) {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("care_sessions").insert({
      asset_id: assetId,
      owner_phone: phone,
      started_at: now,
      ended_at: now,
      status: "completed",
      classification: "Owner-reported care",
    });
    if (error) throw new Error(error.message);
    careLogged = true;
  }
  return { wearsLogged, careLogged };
}
