
# Bos' Kọ́nà Craft Passport — Architecture Implementation Plan

Locking in the three pillars you described: **(1) phone-based ownership auth**, **(2) NFC-only-on-tools care logging**, **(3) session-grouped Care Intelligence that feeds KFI without gamification**.

---

## 1. Phone-based Passport Access

**Goal:** universal QR → personalized passport via phone number lookup against ownership records.

**DB changes**
- `ownership_records` — add `owner_phone TEXT` (E.164), index it. Keep `owner_ref` as freeform secondary.
- Storefront webhook (`/api/public/storefront-webhook`) already creates ownership rows on purchase — extend payload to accept `owner_phone` and persist it.

**Auth flow (Supabase Phone OTP)**
- Enable Phone auth provider (SMS OTP).
- New route `/claim` — user enters phone, receives OTP, verifies.
- On successful verify: server fn `getMyPassports({ phone })` returns all `assets` joined via `ownership_records.owner_phone = <verified phone>`.
- If exactly one → redirect to `/p/$serial`. If multiple → picker. If none → "No purchases found, contact store".
- Session stored client-side; gate personalized views behind `_owner` layout that checks verified phone matches an ownership record.

**Public vs owner views on the passport**
- Public (anyone with QR, no auth): Identity, Provenance, Atelier, Makers, Documentary, Drop story.
- Owner-only (gated by verified phone): Ownership Timeline, KFI, Care Intelligence history, Longevity Simulator, Executive Access, Ecosystem.

---

## 2. NFC Care Tools — Backend

**New tables**

```
care_tools
  tool_id TEXT PK              -- e.g. "premium_brush_v1"
  tool_name TEXT
  tool_type TEXT               -- cleaning | finishing | sole | …
  kfi_weight NUMERIC            -- contribution hint (not direct add)
  active BOOLEAN
  created_at

care_events
  id UUID PK
  asset_id UUID FK assets
  owner_phone TEXT             -- whichever owner triggered it
  tool_id TEXT FK care_tools
  session_id UUID              -- grouping (see §3)
  occurred_at TIMESTAMPTZ
  raw_payload JSONB            -- forensic copy of NFC tap

care_sessions
  id UUID PK
  asset_id UUID FK
  owner_phone TEXT
  started_at, ended_at TIMESTAMPTZ
  status TEXT                  -- in_progress | completed | abandoned
  tools_used TEXT[]            -- derived: [premium_brush_v1, microfiber_finish_v1]
  classification TEXT           -- "Maintenance Session" | "Surface Clean" | …
```

**RLS**
- `care_tools` — public read (catalog), admin write.
- `care_events` / `care_sessions` — readable only to the owner whose verified phone matches `owner_phone`; admin read.

**Seeds**
- `premium_brush_v1` (cleaning, +1)
- `microfiber_finish_v1` (finishing, +0.5)
- (placeholder, inactive) `sole_maintenance_v1`

---

## 3. NFC Tap Ingestion + Session Grouping

**Endpoint:** `POST /api/public/nfc-tap` (server route)

Payload (signed via shared secret in NFC URL or HMAC):
```
{ asset_serial, tool_id, owner_phone, tapped_at }
```

**Session logic (server-side, single insert + RPC):**
1. Validate signature + lookup asset + lookup `care_tool`.
2. Find latest `care_sessions` for `(asset_id, owner_phone)` with `status='in_progress'` and `started_at > now() - interval '15 minutes'`.
3. If none → create new session (status `in_progress`, started_at = tap time).
4. Insert `care_events` row referencing that session.
5. Close the session (status `completed`, classification computed) when either:
   - both `cleaning` + `finishing` tools tapped → `"Completed Maintenance Session"`, OR
   - 15-minute window elapses with only one tool → `"Partial Care Session"` (background job / lazy resolve on next read).

This eliminates the "2 separate events" noise.

---

## 4. KFI Signal Wiring (no gamification)

KFI engine consumes **sessions**, not raw events.

- New helper `computeKfiFromSessions(asset_id)` reads completed sessions over the asset's lifetime and produces:
  - `consistency_score` — rolling cadence of completed sessions vs age_days.
  - `recency_penalty` — days since last session.
  - `stewardship_signal` — ratio of completed vs partial sessions.
- Plug into existing `state-engine.ts` alongside `wears`, `nfc_scans` (which we'll deprecate as direct KFI input), `repairs`.

No per-tap reward. No streaks. Trend-based only.

---

## 5. Admin

- Admin tab **"Care Tools"** — CRUD on `care_tools` catalog.
- Admin view of `care_sessions` per asset (read-only audit).
- Admin can manually link a phone to an `ownership_record` if the webhook missed it.

---

## 6. Public surfaces (owner-only)

- `/care` route → session-grouped timeline ("Maintenance Session · Mar 14 · brush + cloth").
- KFI ring already exists — refactored to pull from session-derived signals.
- Longevity Simulator (later) uses the same signals.

---

## Build order (suggested phases)

1. **Phone auth + ownership lookup** (Supabase phone provider, `/claim` route, `_owner` gate, extend webhook with `owner_phone`).
2. **Care tools + events + sessions schema** (+ seeds + RLS).
3. **`/api/public/nfc-tap` endpoint** with session grouping.
4. **Care Intelligence UI** (owner-only timeline reading from sessions).
5. **KFI refactor** to consume session signals instead of raw counters.
6. **Admin** care-tools CRUD + audit view.

---

## Open questions before I start phase 1

1. **NFC tap auth** — sign tap URLs with HMAC (`?sig=…`) so only your physical chips can post, or trust device-side phone session? Recommend HMAC + shared secret embedded in chip URL.
2. **Phone OTP cost** — Supabase Phone Auth uses Twilio/MessageBird (you provide creds). OK to proceed and ask for Twilio creds when we hit phase 1, or prefer a different verification path (e.g. magic link to phone via WhatsApp Business)?
3. **Multi-owner per asset** — resale/gifting. Treat ownership as "current owner = latest `ownership_records` row for that asset", and historical owners lose access? Or keep read-only access to prior owners?

Confirm the plan + answer the 3 questions and I'll start with phase 1.
