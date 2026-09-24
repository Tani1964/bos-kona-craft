/**
 * Daily insight generator (pg_cron target).
 *
 * Fires for every (asset, owner_phone) pair that has recent activity and
 * writes two kinds of contextual CareWhisper cards:
 *
 *   1. preventive         — rolling 7d avg humidity ≥ 75 across wear events
 *   2. maintenance_overdue — no completed care_session for > 30d AND
 *                            ≥ 3 wear events in that window
 *
 * De-duped: skips generation if an insight of the same kind was created
 * for that (asset, owner) in the last 7 days.
 *
 * Auth: requires Supabase anon `apikey` header — matches the pg_cron
 * pattern. Route lives under /api/public/* which bypasses the platform
 * auth wall on the published site.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const HUMIDITY_THRESHOLD = 75;
const OVERDUE_DAYS = 30;
const OVERDUE_MIN_WEARS = 3;
const DEDUP_DAYS = 7;

type Pair = { asset_id: string; owner_phone: string };

function daysAgoIso(d: number) {
  return new Date(Date.now() - d * 86400000).toISOString();
}

async function alreadyHas(
  asset_id: string,
  owner_phone: string,
  kind: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("care_insights")
    .select("id")
    .eq("asset_id", asset_id)
    .eq("owner_phone", owner_phone)
    .eq("kind", kind)
    .gte("created_at", daysAgoIso(DEDUP_DAYS))
    .limit(1)
    .maybeSingle();
  return !!data;
}

export const Route = createFileRoute("/api/public/hooks/generate-insights")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || !apikey || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const since90 = daysAgoIso(90);
        const sinceOverdue = daysAgoIso(OVERDUE_DAYS);
        const since7 = daysAgoIso(7);

        // 1. Collect active (asset, owner) pairs from the last 90d of wear_events.
        const { data: recentWears, error: wearErr } = await supabaseAdmin
          .from("wear_events")
          .select("asset_id, owner_phone")
          .eq("status", "confirmed")
          .gte("started_at", since90);
        if (wearErr) {
          return new Response(
            JSON.stringify({ error: wearErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const pairKey = (p: Pair) => `${p.asset_id}::${p.owner_phone}`;
        const pairs = new Map<string, Pair>();
        for (const row of recentWears ?? []) {
          if (!row.asset_id || !row.owner_phone) continue;
          pairs.set(pairKey(row as Pair), {
            asset_id: row.asset_id,
            owner_phone: row.owner_phone,
          });
        }

        type InsightInsert = {
          asset_id: string;
          owner_phone: string;
          kind: string;
          body: string;
          source_ref: any;
        };
        const inserts: InsightInsert[] = [];

        let preventiveCount = 0;
        let overdueCount = 0;

        for (const pair of pairs.values()) {
          // ── Preventive: rolling 7d humidity ──
          const { data: recent7 } = await supabaseAdmin
            .from("wear_events")
            .select("weather_snapshot")
            .eq("status", "confirmed")
            .eq("asset_id", pair.asset_id)
            .eq("owner_phone", pair.owner_phone)
            .gte("started_at", since7);

          const humidities = (recent7 ?? [])
            .map((r: any) => Number(r?.weather_snapshot?.humidity))
            .filter((n) => Number.isFinite(n));
          if (humidities.length >= 2) {
            const avg = humidities.reduce((a, b) => a + b, 0) / humidities.length;
            if (avg >= HUMIDITY_THRESHOLD) {
              const exists = await alreadyHas(
                pair.asset_id,
                pair.owner_phone,
                "preventive",
              );
              if (!exists) {
                inserts.push({
                  asset_id: pair.asset_id,
                  owner_phone: pair.owner_phone,
                  kind: "preventive",
                  body: `The last week has been humid (avg ${Math.round(avg)}%). A light conditioning session helps the leather breathe.`,
                  source_ref: { rolling_humidity_7d: +avg.toFixed(1) },
                });
                preventiveCount++;
              }
            }
          }

          // ── Maintenance overdue ──
          const { data: wearsWindow } = await supabaseAdmin
            .from("wear_events")
            .select("id")
            .eq("status", "confirmed")
            .eq("asset_id", pair.asset_id)
            .eq("owner_phone", pair.owner_phone)
            .gte("started_at", sinceOverdue);

          const wearsIn30 = wearsWindow?.length ?? 0;

          const { data: lastCare } = await supabaseAdmin
            .from("care_sessions")
            .select("ended_at, started_at, status")
            .eq("asset_id", pair.asset_id)
            .eq("owner_phone", pair.owner_phone)
            .or("status.eq.complete,ended_at.not.is.null")
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastCareAt = lastCare?.ended_at ?? lastCare?.started_at ?? null;
          const daysSinceCare = lastCareAt
            ? Math.floor(
                (Date.now() - new Date(lastCareAt).getTime()) / 86400000,
              )
            : Infinity;

          if (wearsIn30 >= OVERDUE_MIN_WEARS && daysSinceCare > OVERDUE_DAYS) {
            const exists = await alreadyHas(
              pair.asset_id,
              pair.owner_phone,
              "maintenance_overdue",
            );
            if (!exists) {
              inserts.push({
                asset_id: pair.asset_id,
                owner_phone: pair.owner_phone,
                kind: "maintenance_overdue",
                body: `You've worn these ${wearsIn30} times in the last month with no care session. A quick brush + cloth pass would keep the finish honest.`,
                source_ref: {
                  wears_last_30d: wearsIn30,
                  days_since_care: Number.isFinite(daysSinceCare)
                    ? daysSinceCare
                    : null,
                },
              });
              overdueCount++;
            }
          }
        }

        // ── Morning rain pass: one message per owner per day, only when
        // they've worn the piece recently and rain is likely near home.
        let rainSent = 0;
        try {
          const { getWeather } = await import("@/lib/weather.server");
          const { notifyOwner } = await import("@/lib/notify/dispatch.server");
          const recentOwners = new Map<string, string>();
          for (const p of pairs.values()) recentOwners.set(p.owner_phone, p.asset_id);
          const today = new Date().toISOString().slice(0, 10);
          for (const [phone, assetId] of recentOwners) {
            const { data: s } = await supabaseAdmin
              .from("owner_settings")
              .select("home_lat, home_lng, notifications_enabled")
              .eq("owner_phone", phone)
              .maybeSingle();
            if (!s || !s.notifications_enabled || s.home_lat == null || s.home_lng == null) continue;
            const { data: already } = await supabaseAdmin
              .from("notification_log")
              .select("id")
              .eq("owner_phone", phone)
              .eq("kind", "rain_warning")
              .gte("created_at", `${today}T00:00:00Z`)
              .limit(1)
              .maybeSingle();
            if (already) continue;
            const w = await getWeather({ lat: Number(s.home_lat), lng: Number(s.home_lng) });
            if (w.rain_prob_3h < 0.6) continue;
            const { data: asset } = await supabaseAdmin
              .from("assets")
              .select("model_name, serial")
              .eq("id", assetId)
              .maybeSingle();
            const name = asset?.model_name ?? "your pair";
            await notifyOwner(
              { ownerPhone: phone, kind: "rain_warning", assetId },
              {
                title: "Rain expected",
                body: `Rain is likely in the next few hours — maybe not the morning for the ${name}.`,
                data: { path: asset?.serial ? `/p/${asset.serial}` : "/me" },
              },
            );
            rainSent++;
          }
        } catch (e) {
          console.error("[insights] rain pass failed", e);
        }

        if (inserts.length) {
          const { error: insErr } = await supabaseAdmin
            .from("care_insights")
            .insert(inserts);
          if (insErr) {
            return new Response(
              JSON.stringify({ error: insErr.message, tried: inserts.length }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            pairs_scanned: pairs.size,
            preventive: preventiveCount,
            maintenance_overdue: overdueCount,
            total_inserted: inserts.length,
            rain_warnings: rainSent,
            ran_at: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
