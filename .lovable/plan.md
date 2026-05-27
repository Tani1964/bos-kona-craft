
# Craft Passport — Behavior + Environment Intelligence (Final Integrated Plan)

This builds on the prior plan (phone auth + NFC care tools + session grouping, already partially shipped: schema for `care_tools` / `care_events` / `care_sessions`, `ownership_records.owner_phone`, `/api/public/nfc-tap` endpoint). Below is everything new in the latest spec.

---

## 1. New DB schema

```
wear_events
  id              UUID PK
  asset_id        FK assets
  owner_phone     TEXT
  started_at      TIMESTAMPTZ
  ended_at        TIMESTAMPTZ NULL     -- closed on "Back Home" or auto-timeout
  transport_mode  TEXT                  -- walking | car | transit
  location_lat    NUMERIC
  location_lng    NUMERIC
  weather_snapshot JSONB                -- raw API payload (condition, temp, humidity)
  rain_probability NUMERIC              -- 0–1, forecast over next 1–3h
  effective_stress NUMERIC              -- computed (weather × time × transport factor)
  created_at      TIMESTAMPTZ

care_insights
  id              UUID PK
  asset_id        FK
  owner_phone     TEXT
  kind            TEXT                  -- post_wear | preventive | pre_wear_trigger
  body            TEXT                  -- the contextual message
  source_ref      JSONB                 -- {wear_event_id?, session_id?, weather?}
  shown_at        TIMESTAMPTZ NULL
  created_at      TIMESTAMPTZ
```

RLS: admin read/write; owner-scoped reads via server functions that match verified phone.

Reuse: `care_sessions` (already shipped) feeds maintenance signal into KFI.

---

## 2. Passport access (post-activation)

- `/claim?serial=…` — first-time activation, scans box QR, enters + verifies phone via OTP. Writes phone onto the latest `ownership_records` row for that serial.
- `/login` — owner login (phone OTP). After verify → `/me` shows all assets owned by that phone → tap → `/p/$serial`.
- PWA: add `manifest.json`, service worker, "Add to Home Screen" prompt on first successful passport view. Box QR never required again.

**Owner gating**: `_owner` layout reads verified phone from supabase session; passport personalized tabs (Ownership, KFI, Care, Longevity, Out The Door) gated by it. Public tabs (Identity, Provenance, Atelier, Makers, Documentary) stay open.

---

## 3. Out The Door flow

```
[OUT THE DOOR] tap
   → geolocation permission (browser API)
   → server fn createWearEvent({ asset_id, lat, lng, transport_mode })
       → server-side fetch weather API with stored key
       → store snapshot + rain_probability
       → if rain_probability > 0.4 → enqueue pre_wear_trigger care_insight
       → return event_id + immediate "wear context" card
   → UI shows: weather chip, transport chip, "Back Home" button
[BACK HOME] tap (or 12h auto-close)
   → closes wear_event, computes effective_stress, queues post_wear_insight if rain occurred
```

Transport mode picker: 3 buttons (Walking / Car / Public Transport). Default inferred via stored last-choice + simple heuristic (speed if Geolocation watch returns velocity); user can override.

**Stress formula** (initial, tunable):
```
weather_factor   = 1 + (rain_prob × 0.8) + (humidity_norm × 0.2)
transport_factor = { walking: 1.0, transit: 0.6, car: 0.3 }
effective_stress = weather_factor × duration_hours × transport_factor
```

---

## 4. Weather API integration

Server-only fetch (never expose key to client). Endpoint wrapper at `src/lib/weather.server.ts`:

```ts
getWeather({ lat, lng }) → {
  condition, temp_c, humidity, rain_prob_3h, raw
}
```

Cached 10 min by `lat,lng` bucket (300m precision) to limit cost. Called only from server functions.

**Provider**: pick one — see questions below.

---

## 5. Longevity Simulator (refactor)

New inputs (replacing the current static client mock):
1. Wear frequency → count of `wear_events` over time.
2. Maintenance behavior → completed `care_sessions` cadence.
3. Material model → existing per-material curves (denim, leather, crepe), kept in code config.
4. Environmental stress → sum of `effective_stress` from `wear_events`.
5. Transport mix → ratio derived from `wear_events.transport_mode`.

Output: `{ low_years, high_years, confidence }` from a server fn `computeLongevity(asset_id, owner_phone)`. UI renders a range, never a single number.

---

## 6. KFI refactor (stewardship reflection)

`computeKfi(asset_id, owner_phone)` blends:
- `maintenance_consistency` — completed sessions per wear event ratio.
- `care_responsiveness` — time-to-care after rain-exposed wear events.
- `environmental_load` — contextual (does NOT punish; informs interpretation).
- `cadence_health` — neither over-wear nor neglect.

Returns `{ score (0–100), trend: up|stable|down, components }`. No per-action points.

---

## 7. Care Intelligence Layer (contextual, not a route)

Lives as a thin component `<CareWhisper />` rendered on the passport home + after Out The Door + after Back Home. Reads from `care_insights` filtered to last 7 days + unshown. Soft dismiss (marks `shown_at`). At most 1 visible at a time. Never push notifications in v1.

Generation triggers:
- Pre-wear: high rain_prob at Out The Door.
- Post-wear: rain occurred during a wear event → "let AirForm air-dry".
- Preventive: rolling 7d humidity high → "consider light conditioning".
- Maintenance overdue: > 30d since last completed `care_session` AND ≥ N wears → "soft reminder".

---

## 8. Store decoupling

- Remove any "Care Tips" surface from the storefront integration sample (`src/lib/storefront/boskona.ts` link only references product, no care content).
- Webhook contract unchanged except already-added `owner_phone`.

---

## 9. Routes

Public (no auth): `/`, `/p/$serial`, `/p/$serial/provenance|atelier|documentary|makers`.
Owner (phone-verified): `/me`, `/p/$serial/ownership|kfi|care|longevity|wear` and the **Out The Door** action embedded on the passport home.
Admin: existing `/_authenticated/admin` + new tabs for Care Tools catalog and Wear Events audit.

---

## 10. Build order

1. **Decide blockers** (weather provider, OTP provider) — see below.
2. Migration: `wear_events`, `care_insights` (+ RLS).
3. `src/lib/weather.server.ts` + provider secret wired.
4. Phone OTP enablement + `/claim` + `/login` + `_owner` gate + `/me` picker.
5. Out The Door UI + `createWearEvent` / `closeWearEvent` server fns + insight generator.
6. `<CareWhisper />` contextual rendering + Care Intelligence reads.
7. Longevity + KFI refactor consuming `wear_events` + `care_sessions`.
8. Admin Care Tools + Wear Events audit tabs.
9. PWA manifest + install prompt.

---

## Decisions needed before I build

Three things genuinely require your choice — I'll wait on these, then ship phase 2 onward without further prompting.

1. **Weather API** — pick a provider so I request the right secret:
   - OpenWeather (simplest, generous free tier)
   - Tomorrow.io (best precipitation forecasting)
   - WeatherAPI.com (good middle ground)

2. **Phone OTP delivery** — Supabase Phone Auth needs an SMS provider. Twilio is the default; you'd connect Twilio via Lovable's connector (no manual creds copy). Confirm Twilio, or say if you prefer WhatsApp Business / MessageBird.

3. **Multi-owner per asset** (resale/gifting) — when a new ownership_records row is added for an asset, does the previous owner:
   - (a) lose all access, OR
   - (b) keep read-only access to the historical timeline?

Once you answer these three, I'll execute the rest of the plan without further questions.
